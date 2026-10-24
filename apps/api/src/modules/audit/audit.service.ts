import type { AuditEntry, AuditTargetType, PaginationQuery } from '@prajzo/shared';
import type { Types } from 'mongoose';
import { AuditLogModel, type AuditLogRecord } from './audit-log.model';

export type AuditInput = {
  actorId: Types.ObjectId;
  actorName: string;
  actorRole: 'admin' | 'customer';
  action: string;
  summary: string;
  targetType: AuditTargetType;
  targetId: string;
};

/** Adds one line to the activity log. */
export async function recordAudit(input: AuditInput): Promise<void> {
  await AuditLogModel.create({ ...input, at: new Date() });
}

export function toAuditEntry(entry: AuditLogRecord & { id: string }): AuditEntry {
  return {
    id: entry.id,
    at: entry.at.toISOString(),
    actorName: entry.actorName,
    actorRole: entry.actorRole,
    action: entry.action,
    summary: entry.summary,
    targetType: entry.targetType,
    targetId: entry.targetId,
  };
}

/** The latest entries, newest first. */
export async function recentAudit(limit: number): Promise<AuditEntry[]> {
  const entries = await AuditLogModel.find({}).sort({ at: -1, _id: -1 }).limit(limit);
  return entries.map(toAuditEntry);
}

/** A page of the log, newest first, optionally only entries about one kind of thing. */
export async function listAudit(
  { page, limit }: PaginationQuery,
  targetType: AuditTargetType | 'all',
) {
  const filter = targetType === 'all' ? {} : { targetType };
  const [entries, total] = await Promise.all([
    AuditLogModel.find(filter)
      .sort({ at: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    AuditLogModel.countDocuments(filter),
  ]);
  return { items: entries.map(toAuditEntry), page, limit, total };
}
