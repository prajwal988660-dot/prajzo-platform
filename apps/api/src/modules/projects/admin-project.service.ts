import {
  canChangeStatus,
  finalStatuses,
  isFinalStatus,
  projectReferencePattern,
  projectStatusInfo,
  todayInIndia,
  type AdminProjectList,
  type AdminProjectListQuery,
  type AdminStatusChange,
  type ProjectStatus,
  type StatusRequirement,
} from '@prajzo/shared';
import mongoose from 'mongoose';
import { AppError } from '../../lib/errors';
import { escapeRegExp } from '../../lib/regex';
import type { UserDocument } from '../auth/user.model';
import { ProjectRequestModel, type ProjectRequestDocument } from './project-request.model';
import { toAdminProjectSummary } from './project-view';

const notFound = () => new AppError(404, 'NOT_FOUND', "We couldn't find that project.");
const conflict = (message: string) => new AppError(409, 'CONFLICT', message);
const invalid = (fields: Record<string, string>) =>
  new AppError(400, 'VALIDATION_FAILED', 'Some details need fixing.', fields);

const label = (status: ProjectStatus) => projectStatusInfo[status].label;

/** Every project, newest activity first: filtered by status, and searched by words. */
export async function listAdminProjects({
  status,
  q,
  page,
  limit,
}: AdminProjectListQuery): Promise<AdminProjectList> {
  const filter: Record<string, unknown> = {};
  if (status === 'open') filter.status = mongoose.trusted({ $nin: [...finalStatuses] });
  else if (status !== 'all') filter.status = status;
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [
      { reference: pattern },
      { title: pattern },
      { 'contact.name': pattern },
      { 'contact.email': pattern },
    ];
  }

  const [projects, total] = await Promise.all([
    ProjectRequestModel.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ProjectRequestModel.countDocuments(filter),
  ]);
  return { items: projects.map(toAdminProjectSummary), page, limit, total };
}

/** Any project, by its reference number (admins can open every project). */
export async function findProject(reference: string): Promise<ProjectRequestDocument> {
  if (!projectReferencePattern.test(reference)) throw notFound();
  const project = await ProjectRequestModel.findOne({ reference });
  if (!project) throw notFound();
  return project;
}

/** What to tell an admin who left out something a move needs. */
function missingMessage(needs: StatusRequirement, to: ProjectStatus): string {
  if (needs === 'quote') return 'Enter the quote to send';
  if (needs === 'deliveryDate') return 'Choose the delivery date to confirm with the customer';
  if (to === 'awaiting-information') {
    return 'Write the question, or say what you need, so the customer knows what to send';
  }
  if (to === 'cancelled') return 'Say why the project is being cancelled. The customer will see it';
  if (to === 'approved') {
    return 'Say how the customer accepted, for example "Accepted on WhatsApp on 24 Oct"';
  }
  if (to === 'revision-requested') return 'Write what the customer asked to change';
  return 'Write a short note. The customer will see it';
}

/**
 * Moves a project to another status, as an admin. The move must be allowed by the status table,
 * and must come with what that move needs (a quote, a delivery date, or a note the customer will
 * see). It goes through as one database step, and only if nobody changed the status first.
 */
export async function changeProjectStatus(
  admin: UserDocument,
  reference: string,
  input: AdminStatusChange,
  today: string = todayInIndia(),
): Promise<{ project: ProjectRequestDocument; from: ProjectStatus }> {
  const project = await findProject(reference);
  const from = project.status;
  const { to, note } = input;

  const change = canChangeStatus(from, to, 'admin');
  if (!change.allowed) {
    throw conflict(
      `This project can't move from "${label(from)}" to "${label(to)}". It may have changed a moment ago: reload the page to see what is possible now.`,
    );
  }
  const needs = change.needs;

  // What must come with the move, and nothing that doesn't belong to it.
  const fields: Record<string, string> = {};
  if (needs === 'quote') {
    if (!input.quote) fields.quote = missingMessage('quote', to);
  } else if (input.quote) {
    fields.quote = 'A quote can only be sent when moving to "Quote Sent"';
  }

  let deliveryDate = project.confirmedDeliveryDate ?? undefined;
  if (needs === 'deliveryDate') {
    deliveryDate = input.confirmedDeliveryDate ?? deliveryDate;
    if (!deliveryDate) fields.confirmedDeliveryDate = missingMessage('deliveryDate', to);
    else if (deliveryDate < today) {
      fields.confirmedDeliveryDate = 'The delivery date has passed. Choose a new one';
    }
  } else if (input.confirmedDeliveryDate) {
    fields.confirmedDeliveryDate = 'Set the delivery date from the delivery date box';
  }

  if (needs === 'note' && !note) fields.note = missingMessage('note', to);
  if (Object.keys(fields).length > 0) throw invalid(fields);

  const now = new Date();
  const set: Record<string, unknown> = { status: to, customerReplyPending: false };
  const push: Record<string, unknown> = {
    statusHistory: { from, to, by: 'admin', userId: admin._id, byName: admin.name, note, at: now },
  };
  const inc: Record<string, number> = {};

  if (needs === 'quote' && input.quote) {
    push.quotes = {
      version: project.quotes.length + 1,
      ...input.quote,
      sentAt: now,
      sentBy: admin._id,
      sentByName: admin.name,
    };
  }
  if (needs === 'deliveryDate' && deliveryDate && deliveryDate !== project.confirmedDeliveryDate) {
    set.confirmedDeliveryDate = deliveryDate;
    push.events = {
      kind: 'delivery-date',
      by: 'admin',
      userId: admin._id,
      byName: admin.name,
      from: project.confirmedDeliveryDate,
      to: deliveryDate,
      at: now,
    };
  }
  if (from === 'quote-sent' && to === 'approved') {
    // An admin recording an acceptance that arrived another way. It names the latest quote.
    const latest = project.quotes.at(-1);
    if (!latest) throw conflict("There isn't a quote on this project to accept.");
    set.acceptedQuote = { version: latest.version, at: now, by: 'admin' };
    set['revisions.included'] = latest.revisionsIncluded;
    set['revisions.used'] = 0;
  }
  if (to === 'revision-requested') inc['revisions.used'] = 1;

  const updated = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id, status: from },
    { $set: set, $push: push, ...(Object.keys(inc).length > 0 ? { $inc: inc } : {}) },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw conflict(
      'This project was changed by someone else a moment ago, so nothing was changed. Reload the page and try again.',
    );
  }
  return { project: updated, from };
}

/** Confirms the delivery date, or changes it, at any stage before the project is finished. */
export async function setDeliveryDate(
  admin: UserDocument,
  reference: string,
  date: string,
  note: string | undefined,
): Promise<{ project: ProjectRequestDocument; from: string | undefined }> {
  const project = await findProject(reference);
  if (isFinalStatus(project.status)) {
    throw conflict("This project is finished, so its delivery date can't be changed.");
  }
  const from = project.confirmedDeliveryDate ?? undefined;
  if (from === date) throw invalid({ date: 'That is already the delivery date' });

  const updated = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id, status: project.status },
    {
      $set: { confirmedDeliveryDate: date },
      $push: {
        events: {
          kind: 'delivery-date',
          by: 'admin',
          userId: admin._id,
          byName: admin.name,
          from,
          to: date,
          note,
          at: new Date(),
        },
      },
    },
    { returnDocument: 'after' },
  );
  if (!updated) {
    throw conflict(
      'This project was changed by someone else a moment ago, so nothing was changed. Reload the page and try again.',
    );
  }
  return { project: updated, from };
}

/** Adds an internal note. Notes are never changed or removed, and customers never see them. */
export async function addAdminNote(
  admin: UserDocument,
  reference: string,
  text: string,
): Promise<ProjectRequestDocument> {
  const project = await findProject(reference);
  const updated = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id },
    { $push: { adminNotes: { text, by: admin._id, byName: admin.name, at: new Date() } } },
    { returnDocument: 'after' },
  );
  if (!updated) throw notFound();
  return updated;
}
