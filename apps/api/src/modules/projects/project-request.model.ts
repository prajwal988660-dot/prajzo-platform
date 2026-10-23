import {
  contactPreferences,
  projectFeatures,
  projectIntegrations,
  projectStatuses,
} from '@prajzo/shared';
import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** One line of a project's status timeline. */
const historyEntrySchema = new Schema(
  {
    from: { type: String, enum: projectStatuses, default: null },
    to: { type: String, enum: projectStatuses, required: true },
    by: { type: String, enum: ['customer', 'admin'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 1000 },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

/** Who to contact, copied from the customer's account when the request was sent. */
const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
  },
  { _id: false },
);

/**
 * A project request. Quotes, confirmed delivery dates, revisions and internal admin notes are
 * added in Phase 5, when an admin can set them.
 */
const projectRequestSchema = new Schema(
  {
    /** What the customer and Prajzo quote to each other, for example PRZ-2026-0001. */
    reference: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Where the request came from: the Start a Project form, or (Phase 14) the builder. */
    source: {
      type: String,
      enum: ['start-form', 'builder'],
      required: true,
      default: 'start-form',
    },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    categoryKey: { type: String, required: true, trim: true, maxlength: 60 },
    /** The category's title when the request was sent, so it still reads well if it is renamed. */
    categoryTitle: { type: String, required: true, trim: true, maxlength: 100 },
    packageKey: { type: String, trim: true, maxlength: 60 },
    packageName: { type: String, trim: true, maxlength: 100 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    features: { type: [{ type: String, enum: projectFeatures }], default: [] },
    integrations: { type: [{ type: String, enum: projectIntegrations }], default: [] },
    /** A date the customer would like (YYYY-MM-DD). A wish, never a commitment. */
    preferredDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    contactPreference: {
      type: String,
      enum: contactPreferences,
      required: true,
      default: 'email',
    },
    /** So the request stands on its own, even if the customer later changes their account. */
    contact: { type: contactSchema, required: true },
    notes: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: projectStatuses, required: true, default: 'received' },
    statusHistory: { type: [historyEntrySchema], default: [] },
  },
  { timestamps: true },
);
projectRequestSchema.index({ customerId: 1, createdAt: -1 });
projectRequestSchema.index({ status: 1, updatedAt: -1 });

export type ProjectRequestRecord = InferSchemaType<typeof projectRequestSchema>;
export type ProjectRequestDocument = HydratedDocument<ProjectRequestRecord>;
export const ProjectRequestModel = model('ProjectRequest', projectRequestSchema);
