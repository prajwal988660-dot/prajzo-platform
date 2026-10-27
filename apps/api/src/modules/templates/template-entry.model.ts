import { templateKeys } from '@prajzo/shared';
import { model, Schema, type InferSchemaType } from 'mongoose';

/** A template's catalogue listing (D-005). The design itself lives in code, by `key`. */
const templateEntrySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, enum: templateKeys },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    tagline: { type: String, required: true, trim: true, maxlength: 90 },
    description: { type: String, required: true, trim: true, maxlength: 600 },
    categories: { type: [String], default: [] },
    features: { type: [String], default: [] },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    order: { type: Number, default: 100 },
    previewAlt: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

export type TemplateEntryRecord = InferSchemaType<typeof templateEntrySchema>;
export const TemplateEntryModel = model('TemplateEntry', templateEntrySchema);
