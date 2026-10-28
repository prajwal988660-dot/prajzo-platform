import { templateKeys } from '@prajzo/shared';
import { model, Schema, type InferSchemaType } from 'mongoose';

/** A customer's saved design: a complete website configuration, checked on every save. */
const savedDesignSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    templateKey: { type: String, required: true, enum: templateKeys },
    templateVersion: { type: Number, required: true },
    /** Stored as checked by the shared schema (D-004); never used before being checked again. */
    config: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);
savedDesignSchema.index({ owner: 1, updatedAt: -1 });

export type SavedDesignRecord = InferSchemaType<typeof savedDesignSchema>;
export const SavedDesignModel = model('SavedDesign', savedDesignSchema);
