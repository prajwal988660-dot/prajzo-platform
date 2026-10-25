import {
  formatCalendarDate,
  formatRupees,
  projectStatusInfo,
  type ProjectStatus,
} from '@prajzo/shared';
import type { Request } from 'express';
import { describeError } from '../../db/connection';
import type { MailMessage, Mailer } from '../../services/mailer';
import { recordAudit, type AuditInput } from '../audit/audit.service';
import type { UserDocument } from '../auth/user.model';
import {
  confirmationEmail,
  customerEventEmail,
  deliveryDateEmail,
  notificationEmail,
  statusChangeEmail,
  type CustomerEvent,
} from './project-request.emails';
import type { ProjectRequestDocument } from './project-request.model';

type EffectsOptions = {
  mailer: Mailer;
  /** Where notifications for Prajzo go. */
  notifyEmail: string;
  /** The website's public address, for the links in emails. */
  appOrigin: string;
};

const label = (status: ProjectStatus) => projectStatusInfo[status].label;

/**
 * Everything that follows a change to a project, apart from the change itself: a line in the
 * activity log, and the emails. A failure here is logged but never undoes the change, which is
 * already safely saved; and emails never make the person wait.
 */
export function createProjectEffects({ mailer, notifyEmail, appOrigin }: EffectsOptions) {
  function send(req: Request, messages: MailMessage[], reference: string): void {
    void Promise.allSettled(messages.map((message) => mailer.send(message))).then((results) => {
      for (const result of results) {
        if (result.status === 'rejected') {
          req.log.error(
            { reason: describeError(result.reason), reference },
            'Project email failed',
          );
        }
      }
    });
  }

  async function audit(req: Request, input: AuditInput): Promise<void> {
    try {
      await recordAudit(input);
    } catch (error) {
      req.log.error({ reason: describeError(error) }, 'The activity log could not be written');
    }
  }

  const by = (user: UserDocument, role: 'admin' | 'customer') => ({
    actorId: user._id,
    actorName: user.name,
    actorRole: role,
  });

  const customerSummaries: Record<CustomerEvent, (project: ProjectRequestDocument) => string> = {
    'accepted-quote': (project) => {
      const quote = project.quotes.find((item) => item.version === project.acceptedQuote?.version);
      return `Accepted the quote for ${project.reference}${quote ? ` (version ${quote.version}, ${formatRupees(quote.amountPaise)})` : ''}`;
    },
    'declined-quote': (project) => `Declined the quote for ${project.reference}`,
    replied: (project) => `Answered Prajzo's question on ${project.reference}`,
    'requested-revision': (project) => `Asked for a revision on ${project.reference}`,
    'signed-off': (project) => `Said ${project.reference} looks good`,
    cancelled: (project) => `Cancelled ${project.reference}`,
  };

  const customerActions: Record<CustomerEvent, string> = {
    'accepted-quote': 'project.quote-accepted',
    'declined-quote': 'project.quote-declined',
    replied: 'project.replied',
    'requested-revision': 'project.revision-requested',
    'signed-off': 'project.signed-off',
    cancelled: 'project.cancelled',
  };

  return {
    /** For the other admin actions (catalogue, messages) that write to the log directly. */
    audit,

    /** A customer sent a new project request. */
    async projectSent(req: Request, customer: UserDocument, project: ProjectRequestDocument) {
      await audit(req, {
        ...by(customer, 'customer'),
        action: 'project.created',
        summary: `Sent project request ${project.reference}, "${project.title}"`,
        targetType: 'project',
        targetId: project.reference,
      });
      send(
        req,
        [confirmationEmail(project, appOrigin), notificationEmail(project, notifyEmail, appOrigin)],
        project.reference,
      );
    },

    /** A customer did something to their project (answered, accepted, cancelled…). */
    async customerDid(
      req: Request,
      customer: UserDocument,
      project: ProjectRequestDocument,
      event: CustomerEvent,
      detail?: string,
    ) {
      await audit(req, {
        ...by(customer, 'customer'),
        action: customerActions[event],
        summary: customerSummaries[event](project),
        targetType: 'project',
        targetId: project.reference,
      });
      send(
        req,
        [customerEventEmail(project, event, detail, notifyEmail, appOrigin)],
        project.reference,
      );
    },

    /** An admin moved a project to another status. */
    async adminChangedStatus(
      req: Request,
      admin: UserDocument,
      project: ProjectRequestDocument,
      from: ProjectStatus,
      to: ProjectStatus,
      note: string | undefined,
    ) {
      await audit(req, {
        ...by(admin, 'admin'),
        action: 'project.status',
        summary: `Moved ${project.reference} from ${label(from)} to ${label(to)}`,
        targetType: 'project',
        targetId: project.reference,
      });
      send(req, [statusChangeEmail(project, { to, note }, appOrigin)], project.reference);
    },

    /** An admin confirmed or changed the delivery date. */
    async adminSetDeliveryDate(
      req: Request,
      admin: UserDocument,
      project: ProjectRequestDocument,
      from: string | undefined,
      to: string,
      note: string | undefined,
    ) {
      await audit(req, {
        ...by(admin, 'admin'),
        action: 'project.delivery-date',
        summary: from
          ? `Changed the delivery date of ${project.reference} from ${formatCalendarDate(from)} to ${formatCalendarDate(to)}`
          : `Confirmed the delivery date of ${project.reference}: ${formatCalendarDate(to)}`,
        targetType: 'project',
        targetId: project.reference,
      });
      send(req, [deliveryDateEmail(project, { from, to, note }, appOrigin)], project.reference);
    },

    /** An admin added an internal note. Nobody is emailed: customers never see these. */
    async adminAddedNote(req: Request, admin: UserDocument, project: ProjectRequestDocument) {
      await audit(req, {
        ...by(admin, 'admin'),
        action: 'project.note',
        summary: `Added an internal note to ${project.reference}`,
        targetType: 'project',
        targetId: project.reference,
      });
    },
  };
}

export type ProjectEffects = ReturnType<typeof createProjectEffects>;
