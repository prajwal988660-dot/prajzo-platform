import {
  canChangeStatus,
  projectDetailSchema,
  projectReferencePattern,
  type PaginationQuery,
  type ProjectAction,
  type ProjectDetail,
  type ProjectList,
  type ProjectRequest,
  type ProjectSummary,
} from '@prajzo/shared';
import { AppError } from '../../lib/errors';
import type { UserDocument } from '../auth/user.model';
import { findActiveCategoryTitle, findActivePackageName } from '../catalogue/catalogue.service';
import { ProjectRequestModel, type ProjectRequestDocument } from './project-request.model';
import { nextProjectReference } from './reference';

const notFound = () => new AppError(404, 'NOT_FOUND', "We couldn't find that project.");

/** What the owner may do to a project right now. The one place this is decided for customers. */
export function customerActionsFor(status: ProjectRequestDocument['status']): ProjectAction[] {
  return canChangeStatus(status, 'cancelled', 'customer').allowed ? ['cancel'] : [];
}

export function toProjectSummary(project: ProjectRequestDocument): ProjectSummary {
  return {
    reference: project.reference,
    title: project.title,
    status: project.status,
    categoryTitle: project.categoryTitle,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * A project as its owner sees it. Checked against the shared schema, so nothing the schema
 * doesn't list (internal notes, the customer's id) can ever be sent by mistake.
 */
export function toProjectDetail(project: ProjectRequestDocument): ProjectDetail {
  return projectDetailSchema.parse({
    ...toProjectSummary(project),
    categoryKey: project.categoryKey,
    packageKey: project.packageKey ?? null,
    packageName: project.packageName ?? null,
    description: project.description,
    features: project.features,
    integrations: project.integrations,
    preferredDate: project.preferredDate ?? null,
    contactPreference: project.contactPreference,
    phone: project.contact.phone ?? null,
    notes: project.notes ?? null,
    history: project.statusHistory.map((entry) => ({
      from: entry.from ?? null,
      to: entry.to,
      by: entry.by,
      note: entry.note ?? null,
      at: entry.at.toISOString(),
    })),
    allowedActions: customerActionsFor(project.status),
  });
}

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
      { from: null, to: 'received', by: 'customer', userId: customer._id, at: new Date() },
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

/** Cancels one of the customer's own projects, while the workflow still allows them to. */
export async function cancelOwnProject(
  customer: UserDocument,
  reference: string,
  note: string | undefined,
): Promise<ProjectRequestDocument> {
  const project = await getOwnProject(customer, reference);
  const cannotCancel = new AppError(
    409,
    'CONFLICT',
    "This project can't be cancelled at its current stage. Please contact us if you need to stop it.",
  );
  if (!canChangeStatus(project.status, 'cancelled', 'customer').allowed) throw cannotCancel;

  // Only if nobody changed the status in the meantime (an admin may be moving it at this moment).
  const cancelled = await ProjectRequestModel.findOneAndUpdate(
    { _id: project._id, status: project.status },
    {
      $set: { status: 'cancelled' },
      $push: {
        statusHistory: {
          from: project.status,
          to: 'cancelled',
          by: 'customer',
          userId: customer._id,
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
