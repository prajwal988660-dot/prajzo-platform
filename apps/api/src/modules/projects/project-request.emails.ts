import {
  contactPreferenceLabels,
  formatCalendarDate,
  formatRupees,
  projectFeatureLabels,
  projectIntegrationLabels,
  projectStatusInfo,
  siteContact,
  type ProjectStatus,
} from '@prajzo/shared';
import type { MailMessage } from '../../services/mailer';
import type { ProjectRequestDocument } from './project-request.model';

const list = (items: string[]) => (items.length > 0 ? items.join(', ') : '(none chosen)');
const firstName = (project: ProjectRequestDocument) =>
  project.contact.name.split(' ')[0] ?? project.contact.name;
const projectLink = (project: ProjectRequestDocument, appOrigin: string) =>
  `${appOrigin}/account/projects/${project.reference}`;
const adminLink = (project: ProjectRequestDocument, appOrigin: string) =>
  `${appOrigin}/admin/projects/${project.reference}`;
const signature = [
  '',
  `Questions? Reply to this email, or message us on WhatsApp at ${siteContact.phoneDisplay}.`,
  '',
  'Prajzo',
];

/** The confirmation the customer gets. It repeats the reference number and what happens next. */
export function confirmationEmail(project: ProjectRequestDocument, appOrigin: string): MailMessage {
  return {
    to: project.contact.email,
    subject: `We've received your project request ${project.reference}`,
    text: [
      `Hi ${firstName(project)},`,
      '',
      `We've received your project request. Your reference number is ${project.reference}. Please keep it and quote it whenever you contact us about this project.`,
      '',
      `Project: ${project.title}`,
      `Type of website: ${project.categoryTitle}`,
      `Package: ${project.packageName ?? 'Not chosen yet'}`,
      '',
      'What happens next:',
      '1. We read your request and check what you need.',
      '2. We reply with questions, or with a quote that includes the scope, the price and a confirmed delivery date.',
      '3. Nothing starts until you have accepted the quote.',
      '',
      `You can follow your project any time: ${projectLink(project, appOrigin)}`,
      ...signature,
    ].join('\n'),
  };
}

/** The notification Prajzo gets, with everything needed to start the review. */
export function notificationEmail(
  project: ProjectRequestDocument,
  notifyEmail: string,
  appOrigin: string,
): MailMessage {
  return {
    to: notifyEmail,
    replyTo: project.contact.email,
    subject: `New project request ${project.reference}: ${project.title}`,
    text: [
      `Reference: ${project.reference}`,
      `Project: ${project.title}`,
      `Type of website: ${project.categoryTitle}`,
      `Package: ${project.packageName ?? 'Not chosen yet'}`,
      '',
      `Customer: ${project.contact.name} <${project.contact.email}>`,
      `Phone: ${project.contact.phone ?? '(not given)'}`,
      `Prefers: ${contactPreferenceLabels[project.contactPreference]}`,
      `Preferred date (a wish, not a promise): ${project.preferredDate ?? '(none)'}`,
      '',
      `Features: ${list(project.features.map((feature) => projectFeatureLabels[feature]))}`,
      `Integrations: ${list(
        project.integrations.map((integration) => projectIntegrationLabels[integration]),
      )}`,
      '',
      'Description:',
      project.description,
      ...(project.notes ? ['', 'Notes:', project.notes] : []),
      '',
      `Review it: ${adminLink(project, appOrigin)}`,
    ].join('\n'),
  };
}

/** What the admin's note means to the customer, depending on the status it came with. */
function noteHeading(to: ProjectStatus): string {
  if (to === 'awaiting-information') return 'What we need from you:';
  if (to === 'cancelled') return 'Why:';
  if (to === 'revision-requested') return 'The changes asked for:';
  return 'A note from Prajzo:';
}

/** Tells the customer their project has moved on, with the quote or the question when there is one. */
export function statusChangeEmail(
  project: ProjectRequestDocument,
  change: { to: ProjectStatus; note?: string | undefined },
  appOrigin: string,
): MailMessage {
  const info = projectStatusInfo[change.to];
  const quote = change.to === 'quote-sent' ? project.quotes.at(-1) : undefined;
  return {
    to: project.contact.email,
    subject: `Update on your project ${project.reference}: ${info.label}`,
    text: [
      `Hi ${firstName(project)},`,
      '',
      `An update on your project ${project.reference}, "${project.title}":`,
      '',
      `${info.label}. ${info.meaning}`,
      ...(quote
        ? [
            '',
            `Your quote (version ${quote.version})`,
            `Price: ${formatRupees(quote.amountPaise)}`,
            `Rounds of changes included: ${quote.revisionsIncluded}`,
            '',
            'What the price includes:',
            quote.scope,
          ]
        : []),
      ...(change.note ? ['', noteHeading(change.to), change.note] : []),
      '',
      `What happens next: ${info.next}`,
      ...(project.confirmedDeliveryDate
        ? ['', `Confirmed delivery date: ${formatCalendarDate(project.confirmedDeliveryDate)}`]
        : []),
      '',
      `See everything and reply: ${projectLink(project, appOrigin)}`,
      ...signature,
    ].join('\n'),
  };
}

/** Tells the customer the delivery date was confirmed or changed. */
export function deliveryDateEmail(
  project: ProjectRequestDocument,
  change: { from: string | undefined; to: string; note?: string | undefined },
  appOrigin: string,
): MailMessage {
  const changed = change.from !== undefined;
  return {
    to: project.contact.email,
    subject: `Delivery date for your project ${project.reference}: ${formatCalendarDate(change.to)}`,
    text: [
      `Hi ${firstName(project)},`,
      '',
      changed
        ? `We've changed the delivery date for your project ${project.reference}, "${project.title}", from ${formatCalendarDate(change.from!)} to ${formatCalendarDate(change.to)}.`
        : `We've confirmed the delivery date for your project ${project.reference}, "${project.title}": ${formatCalendarDate(change.to)}.`,
      ...(change.note ? ['', 'A note from Prajzo:', change.note] : []),
      '',
      "If anything changes, we'll tell you straight away.",
      '',
      `See your project: ${projectLink(project, appOrigin)}`,
      ...signature,
    ].join('\n'),
  };
}

export type CustomerEvent =
  | 'accepted-quote'
  | 'declined-quote'
  | 'replied'
  | 'requested-revision'
  | 'signed-off'
  | 'cancelled';

const customerEventText: Record<CustomerEvent, { subject: string; sentence: string }> = {
  'accepted-quote': { subject: 'accepted the quote', sentence: 'accepted the quote' },
  'declined-quote': { subject: 'declined the quote', sentence: 'declined the quote' },
  replied: { subject: 'answered your question', sentence: 'answered your question' },
  'requested-revision': { subject: 'asked for a revision', sentence: 'asked for changes' },
  'signed-off': { subject: 'says it looks good', sentence: 'said the project looks good' },
  cancelled: { subject: 'cancelled the project', sentence: 'cancelled the project' },
};

/** Tells Prajzo what a customer just did to their project, so it can be picked up. */
export function customerEventEmail(
  project: ProjectRequestDocument,
  event: CustomerEvent,
  detail: string | undefined,
  notifyEmail: string,
  appOrigin: string,
): MailMessage {
  const { subject, sentence } = customerEventText[event];
  return {
    to: notifyEmail,
    replyTo: project.contact.email,
    subject: `${project.reference}: ${project.contact.name} ${subject}`,
    text: [
      `${project.contact.name} <${project.contact.email}> ${sentence} on ${project.reference}, "${project.title}".`,
      ...(detail ? ['', detail] : []),
      '',
      `Open it: ${adminLink(project, appOrigin)}`,
    ].join('\n'),
  };
}
