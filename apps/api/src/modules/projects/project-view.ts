import {
  adminProjectDetailSchema,
  canChangeStatus,
  isFinalStatus,
  projectDetailSchema,
  projectStatuses,
  type AdminProjectDetail,
  type AdminProjectSummary,
  type AdminTimelineEntry,
  type ProjectAction,
  type ProjectDetail,
  type ProjectSummary,
  type Quote,
  type Revisions,
  type TimelineEntry,
  type WaitingOn,
} from '@prajzo/shared';
import type { ProjectRequestDocument } from './project-request.model';

/*
 * How a stored project looks to each audience. Everything the customer or an admin is shown goes
 * through here and is checked against the shared schemas, so nothing the schemas don't list (the
 * customer's id, internal notes for a customer) can be sent by mistake.
 */

type QuoteRecord = ProjectRequestDocument['quotes'][number];

function toQuote(quote: QuoteRecord, accepted: boolean): Quote {
  return {
    version: quote.version,
    amountPaise: quote.amountPaise,
    scope: quote.scope,
    revisionsIncluded: quote.revisionsIncluded,
    sentAt: quote.sentAt.toISOString(),
    accepted,
  };
}

/** Who has to act next. A customer's answer to a question hands the project back to Prajzo. */
export function waitingOn(project: ProjectRequestDocument): WaitingOn | null {
  if (isFinalStatus(project.status)) return null;
  if (project.status === 'awaiting-information') {
    return project.customerReplyPending ? 'prajzo' : 'customer';
  }
  if (project.status === 'quote-sent' || project.status === 'awaiting-review') return 'customer';
  return 'prajzo';
}

/** The customer answered a question and nobody has moved the project on since. */
export function customerReplied(project: ProjectRequestDocument): boolean {
  return project.status === 'awaiting-information' && project.customerReplyPending === true;
}

/** True once the customer has said the project looks good, since it last became ready for review. */
function signedOffSinceReview(project: ProjectRequestDocument): boolean {
  const readyAt = project.statusHistory
    .filter((entry) => entry.to === 'awaiting-review')
    .map((entry) => entry.at.getTime())
    .at(-1);
  if (readyAt === undefined) return false;
  return project.events.some((event) => event.kind === 'sign-off' && event.at.getTime() >= readyAt);
}

/**
 * What the owner may do to a project right now. The server decides, so the app never repeats a
 * rule: a button exists only when its action is in this list. Each action is tied to the
 * status table (or to the status it needs, for the two that don't change the status).
 */
export function customerActionsFor(project: ProjectRequestDocument): ProjectAction[] {
  const { status } = project;
  const actions: ProjectAction[] = [];
  if (canChangeStatus(status, 'cancelled', 'customer').allowed) actions.push('cancel');
  if (project.quotes.length > 0 && canChangeStatus(status, 'approved', 'customer').allowed) {
    actions.push('accept-quote', 'decline-quote');
  }
  if (status === 'awaiting-information') actions.push('reply');
  if (canChangeStatus(status, 'revision-requested', 'customer').allowed) {
    actions.push('request-revision');
  }
  if (status === 'awaiting-review' && !signedOffSinceReview(project)) actions.push('sign-off');
  return actions;
}

/** The quote the customer should see: the accepted one, or the latest while it awaits an answer. */
export function customerQuote(project: ProjectRequestDocument): Quote | null {
  const acceptedVersion = project.acceptedQuote?.version;
  if (acceptedVersion !== undefined) {
    const accepted = project.quotes.find((quote) => quote.version === acceptedVersion);
    if (accepted) return toQuote(accepted, true);
  }
  if (project.status === 'quote-sent') {
    const latest = project.quotes.at(-1);
    if (latest) return toQuote(latest, false);
  }
  return null;
}

export function revisionsOf(project: ProjectRequestDocument): Revisions | null {
  if (!project.acceptedQuote) return null;
  return { included: project.revisions?.included ?? 0, used: project.revisions?.used ?? 0 };
}

type MergedEntry = { at: Date; order: number; entry: TimelineEntry; actorName: string };

/** Status changes and everything else that happened, in the order it happened. */
function mergedTimeline(project: ProjectRequestDocument): MergedEntry[] {
  const nameOf = (by: 'customer' | 'admin', byName: string | null | undefined) =>
    by === 'customer' ? project.contact.name : (byName ?? 'Prajzo');

  const items: MergedEntry[] = project.statusHistory.map((change) => ({
    at: change.at,
    order: 0,
    actorName: nameOf(change.by, change.byName),
    entry: {
      kind: 'status',
      from: change.from ?? null,
      to: change.to,
      by: change.by,
      note: change.note ?? null,
      at: change.at.toISOString(),
    },
  }));

  for (const event of project.events) {
    const at = event.at.toISOString();
    const actorName = nameOf(event.by, event.byName);
    if (event.kind === 'reply') {
      items.push({
        at: event.at,
        order: 1,
        actorName,
        entry: { kind: 'reply', by: 'customer', text: event.text ?? '', at },
      });
    } else if (event.kind === 'delivery-date') {
      items.push({
        at: event.at,
        order: 1,
        actorName,
        entry: {
          kind: 'delivery-date',
          by: 'admin',
          from: event.from ?? null,
          to: event.to ?? '',
          note: event.note ?? null,
          at,
        },
      });
    } else {
      items.push({
        at: event.at,
        order: 1,
        actorName,
        entry: { kind: 'sign-off', by: 'customer', at },
      });
    }
  }
  return items.sort((a, b) => a.at.getTime() - b.at.getTime() || a.order - b.order);
}

export function customerTimeline(project: ProjectRequestDocument): TimelineEntry[] {
  return mergedTimeline(project).map(({ entry }) => entry);
}

export function adminTimeline(project: ProjectRequestDocument): AdminTimelineEntry[] {
  return mergedTimeline(project).map(({ entry, actorName }) => ({ ...entry, actorName }));
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

/** The part of a project's details that the customer and the admin both see. */
function commonDetails(project: ProjectRequestDocument) {
  return {
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
    confirmedDeliveryDate: project.confirmedDeliveryDate ?? null,
    revisions: revisionsOf(project),
  };
}

/** A project as its owner sees it: no internal notes, no other people's data. */
export function toProjectDetail(project: ProjectRequestDocument): ProjectDetail {
  return projectDetailSchema.parse({
    ...commonDetails(project),
    timeline: customerTimeline(project),
    quote: customerQuote(project),
    allowedActions: customerActionsFor(project),
  });
}

export function toAdminProjectSummary(project: ProjectRequestDocument): AdminProjectSummary {
  return {
    ...toProjectSummary(project),
    customerName: project.contact.name,
    customerEmail: project.contact.email,
    waitingOn: waitingOn(project),
    customerReplied: customerReplied(project),
  };
}

/** Everything an admin sees about a project, including every quote and the internal notes. */
export function toAdminProjectDetail(project: ProjectRequestDocument): AdminProjectDetail {
  const revisions = revisionsOf(project);
  return adminProjectDetailSchema.parse({
    ...commonDetails(project),
    source: project.source,
    customer: {
      id: project.customerId.toString(),
      name: project.contact.name,
      email: project.contact.email,
      phone: project.contact.phone ?? null,
    },
    timeline: adminTimeline(project),
    quotes: project.quotes.map((quote) => ({
      ...toQuote(quote, project.acceptedQuote?.version === quote.version),
      sentByName: quote.sentByName,
    })),
    adminNotes: project.adminNotes.map((note) => ({
      id: note._id.toString(),
      text: note.text,
      byName: note.byName,
      at: note.at.toISOString(),
    })),
    allowedChanges: projectStatuses.flatMap((to) => {
      const change = canChangeStatus(project.status, to, 'admin');
      return change.allowed ? [{ to, needs: change.needs ?? null }] : [];
    }),
    waitingOn: waitingOn(project),
    customerReplied: customerReplied(project),
    revisionsOverIncluded: revisions ? revisions.used > revisions.included : false,
  });
}
