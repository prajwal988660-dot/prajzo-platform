import {
  contactPreferences,
  projectFeatures,
  projectIntegrations,
  projectStatuses,
} from '@prajzo/shared';
import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';

/** One change of status in a project's timeline. */
const historyEntrySchema = new Schema(
  {
    from: { type: String, enum: projectStatuses, default: null },
    to: { type: String, enum: projectStatuses, required: true },
    by: { type: String, enum: ['customer', 'admin'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** The person's name when it happened (customers' names are on the request itself). */
    byName: { type: String, trim: true, maxlength: 100 },
    /** Shown to the customer in their timeline. */
    note: { type: String, trim: true, maxlength: 1500 },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

/** Other things that happen to a project: an answer, a delivery date, a sign-off. */
const eventSchema = new Schema(
  {
    kind: { type: String, enum: ['reply', 'delivery-date', 'sign-off'], required: true },
    by: { type: String, enum: ['customer', 'admin'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    byName: { type: String, trim: true, maxlength: 100 },
    /** The customer's answer (kind "reply"). */
    text: { type: String, trim: true, maxlength: 2000 },
    /** The delivery date before and after (kind "delivery-date"), as YYYY-MM-DD. */
    from: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    to: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    note: { type: String, trim: true, maxlength: 500 },
    at: { type: Date, required: true, default: Date.now },
  },
  { _id: false },
);

/** One version of a quote. Revising a quote adds a new version; old ones are kept. */
const quoteSchema = new Schema(
  {
    version: { type: Number, required: true, min: 1 },
    /** Whole paise (1 rupee = 100 paise). */
    amountPaise: { type: Number, required: true, min: 0 },
    scope: { type: String, required: true, trim: true, maxlength: 3000 },
    revisionsIncluded: { type: Number, required: true, min: 0, max: 20 },
    sentAt: { type: Date, required: true },
    sentBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sentByName: { type: String, required: true, trim: true, maxlength: 100 },
  },
  { _id: false },
);

/** Which version of the quote was accepted, when, and by whom. */
const acceptedQuoteSchema = new Schema(
  {
    version: { type: Number, required: true, min: 1 },
    at: { type: Date, required: true },
    by: { type: String, enum: ['customer', 'admin'], required: true },
  },
  { _id: false },
);

/** An internal note. Customers never see these. */
const adminNoteSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 2000 },
  by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  byName: { type: String, required: true, trim: true, maxlength: 100 },
  at: { type: Date, required: true, default: Date.now },
});

/** Who to contact, copied from the customer's account when the request was sent. */
const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
  },
  { _id: false },
);

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
    events: { type: [eventSchema], default: [] },
    /** Every quote that was sent, oldest first. The last one is the current quote. */
    quotes: { type: [quoteSchema], default: [] },
    acceptedQuote: { type: acceptedQuoteSchema },
    /** A date Prajzo has confirmed (YYYY-MM-DD). */
    confirmedDeliveryDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    /** Set when the quote is accepted: the rounds of changes included, and how many were asked for. */
    revisions: {
      included: { type: Number, min: 0 },
      used: { type: Number, min: 0 },
    },
    /** The customer answered a question and nobody has moved the project on since. */
    customerReplyPending: { type: Boolean, default: false },
    adminNotes: { type: [adminNoteSchema], default: [] },
  },
  { timestamps: true },
);
projectRequestSchema.index({ customerId: 1, createdAt: -1 });
projectRequestSchema.index({ status: 1, updatedAt: -1 });
projectRequestSchema.index({ updatedAt: -1 });

export type ProjectRequestRecord = InferSchemaType<typeof projectRequestSchema>;
export type ProjectRequestDocument = HydratedDocument<ProjectRequestRecord>;
export const ProjectRequestModel = model('ProjectRequest', projectRequestSchema);
