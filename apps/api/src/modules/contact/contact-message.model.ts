import { model, Schema, type InferSchemaType } from 'mongoose';

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    phone: { type: String, trim: true, maxlength: 30 },
    websiteType: { type: String, trim: true, maxlength: 60 },
    packageKey: { type: String, trim: true, maxlength: 60 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    /** When the sender agreed to be contacted about this request. */
    consentAt: { type: Date, required: true },
    status: { type: String, enum: ['new', 'read', 'archived'], default: 'new' },
  },
  { timestamps: true },
);
contactMessageSchema.index({ status: 1, createdAt: -1 });

export type ContactMessageRecord = InferSchemaType<typeof contactMessageSchema>;
export const ContactMessageModel = model('ContactMessage', contactMessageSchema);
