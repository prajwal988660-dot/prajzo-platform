import {
  canChangeStatus,
  projectReferencePattern,
  type PaginationQuery,
  type ProjectList,
  type ProjectRequest,
} from '@prajzo/shared';
import mongoose from 'mongoose';
import { AppError } from '../../lib/errors';
import type { UserDocument } from '../auth/user.model';
import { findActiveCategoryTitle, findActivePackageName } from '../catalogue/catalogue.service';
import { ProjectRequestModel, type ProjectRequestDocument } from './project-request.model';
import { toProjectSummary } from './project-view';
import { nextProjectReference } from './reference';

const notFound = () => new AppError(404, 'NOT_FOUND', "We couldn't find that project.");
const conflict = (message: string) => new AppError(409, 'CONFLICT', message);

/** At most this many answers to one question, so a project can't grow without limit. */
const MAX_REPLIES_PER_QUESTION = 20;

/** Saves a new project request from the Start a Project form, with the status "Request Received". */
export async function createProjectRequest(
  customer: UserDocument,
  input: ProjectRequest,
): Promise<ProjectRequestDocument> {
  // The browser's list of types and packages may be out of date, and a request can be forged.
  const fields: Record<string, string> = {};
  const categoryTitle =
    input.categoryKey === 'other'
      ? 'Something else'
      : await findActiveCategoryTitle(input.categoryKey);
  if (!categoryTitle) fields.categoryKey = 'Choose a website type from the list';
  const packageName =
    !input.packageKey || input.packageKey === 'not-sure'
      ? null
      : await findActivePackageName(input.packageKey);
  if (input.packageKey && input.packageKey !== 'not-sure' && !packageName) {
    fields.packageKey = 'Choose a package from the list';
  }
  if (!categoryTitle || Object.keys(fields).length > 0) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Some details need fixing.', fields);
  }

  const reference = await nextProjectReference();
  return ProjectRequestModel.create({
    reference,
    customerId: customer._id,
    source: 'start-form',
    title: input.title,
    categoryKey: input.categoryKey,
    categoryTitle,
    ...(packageName ? { packageKey: input.packageKey, packageName } : {}),
    description: input.description,
    features: input.features,
    integrations: input.integrations,
    preferredDate: input.preferredDate,
    contactPreference: input.contactPreference,
    contact: { name: customer.name, email: customer.email, phone: input.phone },
    notes: input.notes,
    status: 'received',
    statusHistory: [
      {
        from: null,
        to: 'received',
        by: 'customer',
        userId: customer._id,
        byName: customer.name,
        at: new Date(),
      },
    ],
  });
}

/** The customer's own projects, newest first. */
export async function listOwnProjects(
  customer: UserDocument,
  { page, limit }: PaginationQuery,
): Promise<ProjectList> {
  const filter = { customerId: customer._id };
  const [projects, total] = await Promise.all([
    ProjectRequestModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ProjectRequestModel.countDocuments(filter),
  ]);
  return { items: projects.map(toProjectSummary), page, limit, total };
}

/**
 * One of the customer's own projects. A reference that belongs to someone else, or doesn't
 * exist, gives the same answer, so nobody can find out which references are in use.
 */
export async function getOwnProject(
  customer: UserDocument,
  reference: string,
): Promise<ProjectRequestDocument> {
  if (!projectReferencePattern.test(reference)) throw notFound();
  const project = await ProjectRequestModel.findOne({ reference, customerId: customer._id });
  if (!project) throw notFound();
  return project;
}

/*
 * What a customer can do to a project. Each action is checked against the status table, and is
 * applied as ONE database update that only goes through if the project is still in the status
 * we looked at (an admin may be moving it at this very moment). If it isn't, the customer is
 * told to look again instead of something unexpected happening.
 */

const changedUnderYou = () =>
  conflict('This project has just changed, so that no longer applies. Please look at it again.');

/** Cancels one of the customer's own projects, while the workflow still allows them to. */
export async function cancelOwnProject(
  customer: UserDocument,
  reference: string,
  note: string | undefined,
): Promise<ProjectRequestDocument> {
  const project = await getOwnProject(customer, reference);
  const cannotCancel = conflict(
    "This project can't be cancelled at its current stage. Please contact us if you need to stop it.",
  );
  if (!canChangeStatus(project.status, 'cancelled', 'customer').allowed) throw cannotCancel;

  const cancelled = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id, status: project.status },
    {
      $set: { status: 'cancelled', customerReplyPending: false },
      $push: {
        statusHistory: {
          from: project.status,
          to: 'cancelled',
          by: 'customer',
          userId: customer._id,
          byName: customer.name,
          note,
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!cancelled) throw cannotCancel;
  return cancelled;
}

/** The quote the customer is answering must be the latest one, in the status "Quote Sent". */
async function quoteAwaitingAnswer(
  customer: UserDocument,
  reference: string,
  quoteVersion: number,
) {
  const project = await getOwnProject(customer, reference);
  const latest = project.quotes.at(-1);
  if (project.status !== 'quote-sent' || !latest) {
    throw conflict("There isn't a quote waiting for your answer on this project.");
  }
  if (latest.version !== quoteVersion) {
    throw conflict('This quote has changed since you opened it. Please read the new quote.');
  }
  return { project, quote: latest };
}

/** Accepts the quote the customer was looking at: the project becomes "Approved". */
export async function acceptQuote(
  customer: UserDocument,
  reference: string,
  quoteVersion: number,
): Promise<ProjectRequestDocument> {
  const { project, quote } = await quoteAwaitingAnswer(customer, reference, quoteVersion);
  const now = new Date();
  const accepted = await ProjectRequestModel.findOneAndUpdate(
    {
      _id: project._id,
      status: 'quote-sent',
      // Still the same quote: if an admin sent a newer one meanwhile, this will not match.
      quotes: mongoose.trusted({ $size: project.quotes.length }),
    },
    {
      $set: {
        status: 'approved',
        acceptedQuote: { version: quote.version, at: now, by: 'customer' },
        'revisions.included': quote.revisionsIncluded,
        'revisions.used': 0,
        customerReplyPending: false,
      },
      $push: {
        statusHistory: {
          from: 'quote-sent',
          to: 'approved',
          by: 'customer',
          userId: customer._id,
          byName: customer.name,
          at: now,
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!accepted) throw changedUnderYou();
  return accepted;
}

/** Declines the quote: the project is cancelled, and the reason (if given) goes in the timeline. */
export async function declineQuote(
  customer: UserDocument,
  reference: string,
  quoteVersion: number,
  note: string | undefined,
): Promise<ProjectRequestDocument> {
  const { project } = await quoteAwaitingAnswer(customer, reference, quoteVersion);
  const declined = await ProjectRequestModel.findOneAndUpdate(
    {
      _id: project._id,
      status: 'quote-sent',
      quotes: mongoose.trusted({ $size: project.quotes.length }),
    },
    {
      $set: { status: 'cancelled', customerReplyPending: false },
      $push: {
        statusHistory: {
          from: 'quote-sent',
          to: 'cancelled',
          by: 'customer',
          userId: customer._id,
          byName: customer.name,
          note: note ? `Quote declined: ${note}` : 'Quote declined',
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!declined) throw changedUnderYou();
  return declined;
}

/** Answers the question Prajzo asked. The status stays as it is until an admin moves it on. */
export async function replyToQuestion(
  customer: UserDocument,
  reference: string,
  message: string,
): Promise<ProjectRequestDocument> {
  const project = await getOwnProject(customer, reference);
  if (project.status !== 'awaiting-information') {
    throw conflict("We aren't waiting for an answer on this project right now.");
  }
  const askedAt = project.statusHistory
    .filter((entry) => entry.to === 'awaiting-information')
    .map((entry) => entry.at.getTime())
    .at(-1);
  const answers = project.events.filter(
    (event) => event.kind === 'reply' && event.at.getTime() >= (askedAt ?? 0),
  ).length;
  if (answers >= MAX_REPLIES_PER_QUESTION) {
    throw conflict(
      "You've sent a lot of answers already. Please wait for our reply, or contact us.",
    );
  }

  const replied = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id, status: 'awaiting-information' },
    {
      $set: { customerReplyPending: true },
      $push: {
        events: {
          kind: 'reply',
          by: 'customer',
          userId: customer._id,
          byName: customer.name,
          text: message,
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!replied) throw changedUnderYou();
  return replied;
}

/** Asks for changes to the finished project. It counts against the revisions the quote includes. */
export async function requestRevision(
  customer: UserDocument,
  reference: string,
  message: string,
): Promise<ProjectRequestDocument> {
  const project = await getOwnProject(customer, reference);
  if (!canChangeStatus(project.status, 'revision-requested', 'customer').allowed) {
    throw conflict("This project isn't ready for you to review yet.");
  }
  const revised = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id, status: 'awaiting-review' },
    {
      $set: { status: 'revision-requested', customerReplyPending: false },
      $inc: { 'revisions.used': 1 },
      $push: {
        statusHistory: {
          from: 'awaiting-review',
          to: 'revision-requested',
          by: 'customer',
          userId: customer._id,
          byName: customer.name,
          note: message,
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!revised) throw changedUnderYou();
  return revised;
}

/** Says the finished project looks good. Prajzo then completes it; the status doesn't change here. */
export async function signOff(
  customer: UserDocument,
  reference: string,
): Promise<ProjectRequestDocument> {
  const project = await getOwnProject(customer, reference);
  if (project.status !== 'awaiting-review') {
    throw conflict("This project isn't ready for you to review yet.");
  }
  const readyAt = project.statusHistory
    .filter((entry) => entry.to === 'awaiting-review')
    .map((entry) => entry.at.getTime())
    .at(-1);
  const alreadySignedOff = project.events.some(
    (event) => event.kind === 'sign-off' && event.at.getTime() >= (readyAt ?? 0),
  );
  if (alreadySignedOff) throw conflict("You've already told us it looks good.");

  const signed = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id, status: 'awaiting-review' },
    {
      $push: {
        events: {
          kind: 'sign-off',
          by: 'customer',
          userId: customer._id,
          byName: customer.name,
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!signed) throw changedUnderYou();
  return signed;
}
