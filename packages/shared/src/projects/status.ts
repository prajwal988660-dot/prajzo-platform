import { z } from 'zod';

/**
 * The eleven stages of a project request, in the order a typical project passes through them.
 * The rules below are the proposal in docs/ARCHITECTURE.md section 8, to be confirmed with the
 * owner before Phase 5. Phase 4 uses only the first status and the cancellation rules.
 */
export const projectStatuses = [
  'received',
  'under-review',
  'awaiting-information',
  'quote-sent',
  'approved',
  'in-development',
  'testing',
  'awaiting-review',
  'revision-requested',
  'completed',
  'cancelled',
] as const;
export type ProjectStatus = (typeof projectStatuses)[number];
export const projectStatusSchema = z.enum(projectStatuses);

export type StatusTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

/** What each status is called, and what it means for the customer. Plain words, no promises. */
export const projectStatusInfo: Record<
  ProjectStatus,
  { label: string; tone: StatusTone; meaning: string; next: string }
> = {
  received: {
    label: 'Request Received',
    tone: 'brand',
    meaning: "We've received your request.",
    next: "We'll read it and reply with questions or a quote. We don't start any work until you have agreed to a quote.",
  },
  'under-review': {
    label: 'Under Review',
    tone: 'brand',
    meaning: "We're reviewing your request.",
    next: "We're checking what you need and preparing questions or a quote.",
  },
  'awaiting-information': {
    label: 'Awaiting Customer Information',
    tone: 'warning',
    meaning: 'We need a little more information from you.',
    next: "Reply to our message and we'll carry on with your review.",
  },
  'quote-sent': {
    label: 'Quote Sent',
    tone: 'warning',
    meaning: 'Your quote is ready.',
    next: 'Read the quote, then accept or decline it. Nothing starts until you accept.',
  },
  approved: {
    label: 'Approved',
    tone: 'success',
    meaning: "You've accepted the quote.",
    next: "We'll confirm a delivery date and start building.",
  },
  'in-development': {
    label: 'In Development',
    tone: 'brand',
    meaning: "We're building your project.",
    next: "We'll test it, then ask you to review it.",
  },
  testing: {
    label: 'Testing',
    tone: 'brand',
    meaning: "We're testing your project.",
    next: "When testing is done, we'll ask you to review it.",
  },
  'awaiting-review': {
    label: 'Awaiting Customer Review',
    tone: 'warning',
    meaning: 'Your project is ready for you to review.',
    next: "Check it, then tell us it's right or ask for changes.",
  },
  'revision-requested': {
    label: 'Revision Requested',
    tone: 'warning',
    meaning: "You've asked for changes.",
    next: "We'll make the changes and ask you to review the project again.",
  },
  completed: {
    label: 'Completed',
    tone: 'success',
    meaning: 'Your project is complete.',
    next: 'Thank you for working with Prajzo.',
  },
  cancelled: {
    label: 'Cancelled',
    tone: 'danger',
    meaning: 'This project was cancelled.',
    next: "No further work will be done on it. You're welcome to start a new project at any time.",
  },
};

export type StatusActor = 'customer' | 'admin';

/** Something an admin must provide for a change to be accepted (enforced in Phase 5). */
export type StatusRequirement = 'quote' | 'deliveryDate' | 'note';

type Transition = {
  from: ProjectStatus;
  to: ProjectStatus;
  by: readonly StatusActor[];
  needs?: StatusRequirement;
};

const both: readonly StatusActor[] = ['customer', 'admin'];
const adminOnly: readonly StatusActor[] = ['admin'];

/** Every allowed change of status. Anything not listed here is refused. */
export const statusTransitions: readonly Transition[] = [
  { from: 'received', to: 'under-review', by: adminOnly },
  { from: 'under-review', to: 'awaiting-information', by: adminOnly },
  { from: 'under-review', to: 'quote-sent', by: adminOnly, needs: 'quote' },
  { from: 'awaiting-information', to: 'under-review', by: adminOnly },
  // Accepting a quote is the customer's own decision; an admin may record one received another way.
  { from: 'quote-sent', to: 'approved', by: both },
  { from: 'quote-sent', to: 'under-review', by: adminOnly },
  { from: 'approved', to: 'in-development', by: adminOnly, needs: 'deliveryDate' },
  { from: 'in-development', to: 'testing', by: adminOnly },
  { from: 'in-development', to: 'awaiting-information', by: adminOnly },
  { from: 'testing', to: 'in-development', by: adminOnly },
  { from: 'testing', to: 'awaiting-review', by: adminOnly },
  { from: 'awaiting-review', to: 'revision-requested', by: both },
  { from: 'awaiting-review', to: 'completed', by: adminOnly },
  { from: 'revision-requested', to: 'in-development', by: adminOnly },
  // Early on, the customer may cancel too.
  { from: 'received', to: 'cancelled', by: both },
  { from: 'awaiting-information', to: 'cancelled', by: both },
  { from: 'quote-sent', to: 'cancelled', by: both },
  // Later on, only an admin may, and must say why.
  { from: 'under-review', to: 'cancelled', by: adminOnly, needs: 'note' },
  { from: 'approved', to: 'cancelled', by: adminOnly, needs: 'note' },
  { from: 'in-development', to: 'cancelled', by: adminOnly, needs: 'note' },
  { from: 'testing', to: 'cancelled', by: adminOnly, needs: 'note' },
  { from: 'awaiting-review', to: 'cancelled', by: adminOnly, needs: 'note' },
  { from: 'revision-requested', to: 'cancelled', by: adminOnly, needs: 'note' },
];

export type StatusChange =
  { allowed: true; needs: StatusRequirement | undefined } | { allowed: false };

/** Whether `actor` may move a project from one status to another. */
export function canChangeStatus(
  from: ProjectStatus,
  to: ProjectStatus,
  actor: StatusActor,
): StatusChange {
  const transition = statusTransitions.find(
    (candidate) => candidate.from === from && candidate.to === to && candidate.by.includes(actor),
  );
  return transition ? { allowed: true, needs: transition.needs } : { allowed: false };
}

/** The statuses `actor` may move a project to from its current status. */
export function allowedNextStatuses(from: ProjectStatus, actor: StatusActor): ProjectStatus[] {
  return statusTransitions
    .filter((transition) => transition.from === from && transition.by.includes(actor))
    .map((transition) => transition.to);
}

export const finalStatuses: readonly ProjectStatus[] = ['completed', 'cancelled'];
export const isFinalStatus = (status: ProjectStatus) => finalStatuses.includes(status);
