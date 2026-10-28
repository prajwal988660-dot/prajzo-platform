import { model, Schema, type InferSchemaType } from 'mongoose';

/** One uploaded picture and who uploaded it (for the per-customer limit, and later clean-up). */
const uploadSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** The file's random name, such as 1f0e…c3.webp. */
    file: { type: String, required: true, unique: true },
    bytes: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  { timestamps: true },
);

export type UploadRecord = InferSchemaType<typeof uploadSchema>;
export const UploadModel = model('Upload', uploadSchema);
