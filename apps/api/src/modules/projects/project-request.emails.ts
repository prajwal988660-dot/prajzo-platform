import {
  contactPreferenceLabels,
  projectFeatureLabels,
  projectIntegrationLabels,
  siteContact,
} from '@prajzo/shared';
import type { MailMessage } from '../../services/mailer';
import type { ProjectRequestDocument } from './project-request.model';

const list = (items: string[]) => (items.length > 0 ? items.join(', ') : '(none chosen)');

/** The confirmation the customer gets. It repeats the reference number and what happens next. */
export function confirmationEmail(project: ProjectRequestDocument, appOrigin: string): MailMessage {
  const firstName = project.contact.name.split(' ')[0] ?? project.contact.name;
  return {
    to: project.contact.email,
    subject: `We've received your project request ${project.reference}`,
    text: [
      `Hi ${firstName},`,
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
      `You can follow your project any time: ${appOrigin}/account/projects/${project.reference}`,
      '',
      `Questions? Reply to this email, or message us on WhatsApp at ${siteContact.phoneDisplay}.`,
      '',
      'Prajzo',
    ].join('\n'),
  };
}

/** The notification Prajzo gets, with everything needed to start the review. */
export function notificationEmail(
  project: ProjectRequestDocument,
  notifyEmail: string,
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
    ].join('\n'),
  };
}
