import {
  adminAccountRequestSchema,
  type AdminOverview,
  type PublicUser,
  type RegisterRequest,
  type UserRole,
} from '@prajzo/shared';
import mongoose from 'mongoose';
import { isDuplicateKeyError } from '../../db/errors';
import { AppError } from '../../lib/errors';
import type { Logger } from '../../lib/logger';
import type { Mailer } from '../../services/mailer';
import { ContactMessageModel } from '../contact/contact-message.model';
import { ProjectRequestModel } from '../projects/project-request.model';
import {
  createResetToken,
  hashPassword,
  hashResetToken,
  verifyAgainstDecoy,
  verifyPassword,
} from './password';
import { PasswordResetTokenModel } from './password-reset-token.model';
import { UserModel, type UserDocument } from './user.model';

const RESET_TOKEN_LIFETIME_MS = 60 * 60 * 1000; // one hour

export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? null,
    role: user.role,
  };
}

const emailTaken = () =>
  new AppError(409, 'CONFLICT', 'An account with this email already exists.', {
    email: 'An account with this email already exists. Try signing in instead.',
  });

export async function registerCustomer(input: RegisterRequest): Promise<UserDocument> {
  try {
    return await UserModel.create({
      email: input.email,
      name: input.name,
      phone: input.phone,
      passwordHash: await hashPassword(input.password),
      role: 'customer',
      termsAcceptedAt: new Date(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw emailTaken();
    throw error;
  }
}

/**
 * Checks an email and password for the given kind of account. Returns null when they don't
 * match: wrong password, unknown email and "wrong kind of account" are deliberately
 * indistinguishable. A correct password on a disabled account is refused with a clear message.
 */
export async function authenticate(
  email: string,
  password: string,
  role: UserRole,
): Promise<UserDocument | null> {
  const user = await UserModel.findOne({ email }).select('+passwordHash');
  if (!user) {
    await verifyAgainstDecoy(password);
    return null;
  }
  const passwordMatches = await verifyPassword(user.passwordHash, password);
  if (!passwordMatches || user.role !== role) return null;
  if (user.status !== 'active') {
    throw new AppError(403, 'FORBIDDEN', 'This account has been disabled. Please contact us.');
  }
  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export function findUserById(id: string): Promise<UserDocument | null> {
  return UserModel.findById(id);
}

export async function updateProfile(
  user: UserDocument,
  changes: { name: string; phone: string | undefined },
): Promise<UserDocument> {
  user.name = changes.name;
  user.phone = changes.phone;
  return user.save();
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await UserModel.findById(userId).select('+passwordHash');
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new AppError(400, 'VALIDATION_FAILED', 'Some details need fixing.', {
      currentPassword: "That isn't your current password",
    });
  }
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}

type ResetDeps = { mailer: Mailer; logger: Logger; appOrigin: string };

/**
 * Emails a password-reset link to a customer. Does the same visible thing whether or not the
 * email belongs to an account, so the form can't be used to find out who has one.
 */
export async function startPasswordReset(email: string, deps: ResetDeps): Promise<void> {
  const user = await UserModel.findOne({ email, role: 'customer', status: 'active' });
  if (!user) {
    createResetToken(); // same work, nothing stored
    return;
  }

  await PasswordResetTokenModel.deleteMany({ userId: user._id });
  const { token, tokenHash } = createResetToken();
  await PasswordResetTokenModel.create({
    userId: user._id,
    tokenHash,
    expiresAt: new Date(Date.now() + RESET_TOKEN_LIFETIME_MS),
  });

  const link = `${deps.appOrigin}/reset-password?token=${token}`;
  try {
    await deps.mailer.send({
      to: user.email,
      subject: 'Reset your Prajzo password',
      text: [
        `Hi ${user.name},`,
        '',
        'We received a request to reset the password for your Prajzo account.',
        'Choose a new password here (the link works once, for one hour):',
        link,
        '',
        "If you didn't ask for this, you can ignore this email. Your password stays the same.",
      ].join('\n'),
    });
  } catch (error) {
    deps.logger.error({ err: error }, 'Password reset email failed');
  }
}

/** Sets a new password from a reset link. The token works once and is deleted when used. */
export async function completePasswordReset(token: string, newPassword: string): Promise<string> {
  const invalid = () =>
    new AppError(
      400,
      'BAD_REQUEST',
      'This reset link is invalid or has expired. Please request a new one.',
    );

  // Deleting while reading makes the link single-use even if two requests arrive together.
  // `trusted`: this operator is ours, not user input, so it is exempt from the query sanitizer
  // that strips operators out of anything a visitor could have supplied.
  const record = await PasswordResetTokenModel.findOneAndDelete({
    tokenHash: hashResetToken(token),
    expiresAt: mongoose.trusted({ $gt: new Date() }),
  });
  if (!record) throw invalid();

  const user = await UserModel.findOne({ _id: record.userId, status: 'active' });
  if (!user) throw invalid();

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  await PasswordResetTokenModel.deleteMany({ userId: user._id });
  return user.id;
}

/** Real counts for the admin overview. */
export async function adminOverview(): Promise<AdminOverview> {
  const [customers, total, unread, projectTotal, projectReceived] = await Promise.all([
    UserModel.countDocuments({ role: 'customer' }),
    ContactMessageModel.countDocuments({}),
    ContactMessageModel.countDocuments({ status: 'new' }),
    ProjectRequestModel.countDocuments({}),
    ProjectRequestModel.countDocuments({ status: 'received' }),
  ]);
  return {
    customers,
    contactMessages: { total, unread },
    projectRequests: { total: projectTotal, received: projectReceived },
  };
}

type AdminAccountInput = { name: string; email: string; password: string };

/** Creates an administrator. Only the `admin:create` script calls this; there is no web form. */
export async function createAdminUser(input: AdminAccountInput): Promise<UserDocument> {
  const account = adminAccountRequestSchema.parse(input);
  try {
    return await UserModel.create({
      email: account.email,
      name: account.name,
      passwordHash: await hashPassword(account.password),
      role: 'admin',
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) throw emailTaken();
    throw error;
  }
}

/** Sets a new password for an existing administrator (used when one is forgotten). */
export async function setAdminPassword(email: string, password: string): Promise<void> {
  const { password: checked } = adminAccountRequestSchema
    .pick({ password: true })
    .parse({ password });
  const admin = await UserModel.findOne({ email: email.trim().toLowerCase(), role: 'admin' });
  if (!admin) throw new AppError(404, 'NOT_FOUND', 'No administrator has that email address.');
  admin.passwordHash = await hashPassword(checked);
  await admin.save();
}

export function findUserByEmail(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email: email.trim().toLowerCase() });
}

export function findAdminByEmail(email: string): Promise<UserDocument | null> {
  return UserModel.findOne({ email: email.trim().toLowerCase(), role: 'admin' });
}
