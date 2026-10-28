import { model, Schema, type InferSchemaType } from 'mongoose';
import { templateKeys } from '@prajzo/shared';

const demoSubmissionSchema = new Schema(
  {
    template: { type: String, required: true, enum: templateKeys },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ['new', 'read'], default: 'new' },
    /** MongoDB deletes the submission at this time by itself (D-014). */
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);
// "Expire at the time in expiresAt": MongoDB's clean-up runs about once a minute.
demoSubmissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
demoSubmissionSchema.index({ status: 1, createdAt: -1 });

export type DemoSubmissionRecord = InferSchemaType<typeof demoSubmissionSchema>;
export const DemoSubmissionModel = model('DemoSubmission', demoSubmissionSchema);
