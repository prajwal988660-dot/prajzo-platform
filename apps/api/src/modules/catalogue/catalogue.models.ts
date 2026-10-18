import { deliveryTiers, priceModes } from '@prajzo/shared';
import { model, Schema, type InferSchemaType } from 'mongoose';

const categorySchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    /** Name of the icon the web app shows (from its icon set). */
    icon: { type: String, required: true },
    useCases: { type: [String], default: [] },
    deliveryTier: { type: String, required: true, enum: deliveryTiers },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
categorySchema.index({ active: 1, sortOrder: 1 });

const servicePackageSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    summary: { type: String, required: true, trim: true },
    deliveryTier: { type: String, required: true, enum: deliveryTiers },
    scope: { type: [String], default: [] },
    priceMode: { type: String, required: true, enum: priceModes, default: 'quote' },
    /** Whole paise (₹1 = 100 paise); null while the price is "on request". */
    priceAmountPaise: { type: Number, default: null, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
servicePackageSchema.index({ active: 1, sortOrder: 1 });

export type CategoryRecord = InferSchemaType<typeof categorySchema>;
export type ServicePackageRecord = InferSchemaType<typeof servicePackageSchema>;

export const CategoryModel = model('Category', categorySchema);
export const ServicePackageModel = model('ServicePackage', servicePackageSchema);
