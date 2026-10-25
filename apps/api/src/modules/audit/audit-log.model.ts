import { auditTargetTypes } from '@prajzo/shared';
import { model, Schema, type InferSchemaType } from 'mongoose';

/**
 * What admins did, and what customers did to their projects: who, what, to what, and when.
 * Entries are only ever added, never changed or removed.
 */
const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** The person's name when it happened, so the log still reads well if they change it. */
    actorName: { type: String, required: true, trim: true, maxlength: 100 },
    actorRole: { type: String, enum: ['admin', 'customer'], required: true },
    /** A short code such as "project.status". */
    action: { type: String, required: true, trim: true, maxlength: 60 },
    /** The same thing in plain words, written when it happened. */
    summary: { type: String, required: true, trim: true, maxlength: 400 },
    targetType: { type: String, enum: auditTargetTypes, required: true },
    /** The project reference, the category or package key, or the message id. */
    targetId: { type: String, required: true, trim: true, maxlength: 80 },
    at: { type: Date, required: true, default: Date.now },
  },
  { versionKey: false },
);
auditLogSchema.index({ at: -1 });
auditLogSchema.index({ targetType: 1, at: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1, at: -1 });

export type AuditLogRecord = InferSchemaType<typeof auditLogSchema>;
export const AuditLogModel = model('AuditLog', auditLogSchema);
