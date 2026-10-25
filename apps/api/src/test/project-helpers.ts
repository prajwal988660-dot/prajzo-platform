import {
  addDays,
  adminProjectResponseSchema,
  projectResponseSchema,
  todayInIndia,
} from '@prajzo/shared';
import mongoose from 'mongoose';
import { AuditLogModel } from '../modules/audit/audit-log.model';
import { createAdminUser } from '../modules/auth/auth.service';
import { UserModel } from '../modules/auth/user.model';
import { CategoryModel, ServicePackageModel } from '../modules/catalogue/catalogue.models';
import { ContactMessageModel } from '../modules/contact/contact-message.model';
import { CounterModel } from '../modules/projects/counter.model';
import { ProjectRequestModel } from '../modules/projects/project-request.model';
import { createCaptureMailer, type Mailer } from '../services/mailer';
import { browser, signUp, sessionsCollection } from './auth-helpers';
import { testApp, testEnv } from './helpers';

export const adminAccount = {
  name: 'Prajzo Admin',
  email: 'admin@example.com',
  password: 'a-very-long-admin-password',
};

/** A valid project request, as the Start a Project form sends it. */
export const projectBody = {
  title: 'Website for my studio',
  categoryKey: 'business-websites',
  packageKey: 'professional-website',
  description:
    'A simple five-page website for my photography studio, with a gallery and a contact form.',
  features: ['gallery', 'contact-form'],
  integrations: ['google-maps'],
  contactPreference: 'email',
};

/** What an admin fills in to send a quote. */
export const goodQuote = {
  amountPaise: 1_500_000,
  scope: 'A five-page website with a photo gallery and a contact form, ready to publish.',
  revisionsIncluded: 2,
};

/** A date some days from today (India time), as YYYY-MM-DD. */
export const inDays = (days: number) => addDays(todayInIndia(), days);

export type Agent = ReturnType<typeof browser>;
export type TestApp = ReturnType<typeof testApp>;

/** Empties everything these tests create, and switches every category back on. */
export async function resetEverything(): Promise<void> {
  await Promise.all([
    UserModel.deleteMany({}),
    ProjectRequestModel.deleteMany({}),
    CounterModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    ContactMessageModel.deleteMany({}),
    sessionsCollection().deleteMany({}),
    CategoryModel.updateMany({}, { active: true }),
    ServicePackageModel.updateMany({}, { active: true }),
  ]);
}

/** A fresh app with a mail box you can look into, and limits that don't get in the way. */
export function newProjectApp(
  overrides: Record<string, string> = {},
  mailer: Mailer = createCaptureMailer(),
): TestApp {
  return testApp({
    env: testEnv({
      AUTH_RATE_LIMIT_MAX: '1000',
      PROJECT_REQUEST_RATE_LIMIT_MAX: '1000',
      ...overrides,
    }),
    mailer,
  });
}

export async function signedInCustomer(
  app: TestApp,
  email = 'asha@example.com',
  name = 'Asha Rao',
): Promise<Agent> {
  const agent = browser(app);
  await signUp(agent, { email, name });
  return agent;
}

/** Creates the administrator (if needed) and signs them in. */
export async function signedInAdmin(app: TestApp, account = adminAccount): Promise<Agent> {
  if (!(await UserModel.exists({ email: account.email }))) await createAdminUser(account);
  const agent = browser(app);
  const response = await agent
    .post('/api/v1/auth/admin/login')
    .send({ email: account.email, password: account.password });
  if (response.status !== 200) throw new Error(`Admin sign-in failed: ${response.status}`);
  return agent;
}

/** Sends a project request as this customer; returns its reference number. */
export async function sendProject(
  customer: Agent,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const response = await customer
    .post('/api/v1/project-requests')
    .send({ ...projectBody, ...overrides });
  if (response.status !== 201) {
    throw new Error(
      `Sending a project failed with ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
  return projectResponseSchema.parse(response.body).project.reference;
}

/** An admin moves a project to another status. Returns the raw response. */
export const adminChange = (admin: Agent, reference: string, body: Record<string, unknown>) =>
  admin.post(`/api/v1/admin/project-requests/${reference}/status`).send(body);

/** An admin moves a project along and expects it to work; returns what the admin sees. */
export async function adminMoves(admin: Agent, reference: string, body: Record<string, unknown>) {
  const response = await adminChange(admin, reference, body);
  if (response.status !== 200) {
    throw new Error(
      `Moving ${reference} failed with ${response.status}: ${JSON.stringify(response.body)}`,
    );
  }
  return adminProjectResponseSchema.parse(response.body).project;
}

/** A customer does something to their project. Returns the raw response. */
export const customerDoes = (customer: Agent, reference: string, body: Record<string, unknown>) =>
  customer.post(`/api/v1/project-requests/${reference}/actions`).send(body);

/** What the admin sees of a project right now. */
export async function adminView(admin: Agent, reference: string) {
  const response = await admin.get(`/api/v1/admin/project-requests/${reference}`);
  if (response.status !== 200)
    throw new Error(`Opening ${reference} failed with ${response.status}`);
  return adminProjectResponseSchema.parse(response.body).project;
}

/** What the customer sees of a project right now. */
export async function customerView(customer: Agent, reference: string) {
  const response = await customer.get(`/api/v1/project-requests/${reference}`);
  if (response.status !== 200)
    throw new Error(`Opening ${reference} failed with ${response.status}`);
  return projectResponseSchema.parse(response.body).project;
}

/** Forces a project into a status (for tests about what each status allows). */
export async function forceStatus(
  reference: string,
  status: string,
  extra: Record<string, unknown> = {},
) {
  await ProjectRequestModel.updateOne({ reference }, { $set: { status, ...extra } });
}

/** A project in "Quote Sent" with one quote on it, built the way the real flow builds it. */
export async function projectWithQuote(
  customer: Agent,
  admin: Agent,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const reference = await sendProject(customer, overrides);
  await adminMoves(admin, reference, { to: 'under-review' });
  await adminMoves(admin, reference, { to: 'quote-sent', quote: goodQuote });
  return reference;
}

/** Collections are cleared between tests by resetEverything; this is for tests that need a count. */
export const auditCount = () => AuditLogModel.countDocuments();

export { mongoose };
