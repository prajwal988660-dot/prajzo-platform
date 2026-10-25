import type {
  AdminContactMessage,
  AdminMessageList,
  ContactMessageStatus,
  PaginationQuery,
} from '@prajzo/shared';
import type { AdminMessageFilter } from '@prajzo/shared';
import mongoose from 'mongoose';
import { AppError } from '../../lib/errors';
import { escapeRegExp } from '../../lib/regex';
import { CategoryModel, ServicePackageModel } from '../catalogue/catalogue.models';
import { ContactMessageModel, type ContactMessageRecord } from '../contact/contact-message.model';

const notFound = () => new AppError(404, 'NOT_FOUND', "We couldn't find that message.");

type MessageDocument = ContactMessageRecord & { id: string; createdAt: Date };

/** The names of the website types and packages the senders chose, as they are now. */
async function titleLookup(messages: MessageDocument[]) {
  const typeKeys = [...new Set(messages.flatMap((m) => (m.websiteType ? [m.websiteType] : [])))];
  const packageKeys = [...new Set(messages.flatMap((m) => (m.packageKey ? [m.packageKey] : [])))];
  const [categories, packages] = await Promise.all([
    typeKeys.length > 0
      ? CategoryModel.find({ key: mongoose.trusted({ $in: typeKeys }) }).select('key title')
      : [],
    packageKeys.length > 0
      ? ServicePackageModel.find({ key: mongoose.trusted({ $in: packageKeys }) }).select('key name')
      : [],
  ]);
  const types = new Map(categories.map((c) => [c.key, c.title]));
  const names = new Map(packages.map((p) => [p.key, p.name]));
  types.set('other', 'Something else');
  names.set('not-sure', 'Not sure yet');
  return { types, names };
}

function toMessage(
  message: MessageDocument,
  lookup: Awaited<ReturnType<typeof titleLookup>>,
): AdminContactMessage {
  return {
    id: message.id,
    name: message.name,
    email: message.email,
    phone: message.phone ?? null,
    websiteType: message.websiteType ?? null,
    websiteTypeTitle: message.websiteType
      ? (lookup.types.get(message.websiteType) ?? message.websiteType)
      : null,
    packageKey: message.packageKey ?? null,
    packageName: message.packageKey
      ? (lookup.names.get(message.packageKey) ?? message.packageKey)
      : null,
    message: message.message,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
  };
}

/** Messages from the contact form, newest first. "inbox" means everything not archived. */
export async function listMessages({
  status,
  q,
  page,
  limit,
}: PaginationQuery & {
  status: AdminMessageFilter;
  q?: string | undefined;
}): Promise<AdminMessageList> {
  const filter: Record<string, unknown> = {};
  if (status === 'inbox') filter.status = mongoose.trusted({ $in: ['new', 'read'] });
  else if (status !== 'all') filter.status = status;
  if (q) {
    const pattern = new RegExp(escapeRegExp(q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { message: pattern }];
  }
  const [messages, total] = await Promise.all([
    ContactMessageModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ContactMessageModel.countDocuments(filter),
  ]);
  const lookup = await titleLookup(messages);
  return { items: messages.map((message) => toMessage(message, lookup)), page, limit, total };
}

/** Marks a message new, read or archived. Returns it as it is now, and how it was before. */
export async function updateMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<{ message: AdminContactMessage; before: ContactMessageStatus }> {
  if (!/^[0-9a-f]{24}$/i.test(id)) throw notFound();
  const current = await ContactMessageModel.findById(id);
  if (!current) throw notFound();
  const before = current.status;
  const updated = await ContactMessageModel.findOneAndUpdate(
    { _id: id },
    { $set: { status } },
    { returnDocument: 'after' },
  );
  if (!updated) throw notFound();
  return { message: toMessage(updated, await titleLookup([updated])), before };
}
