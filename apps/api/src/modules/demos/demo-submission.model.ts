import { model, Schema, type InferSchemaType } from 'mongoose';
import { templateKeys } from '@prajzo/shared';

const demoSubmissionSchema = new Schema(
  {
    /** A contact message, a registration (Event demo) or an enquiry (Catalogue demo). */
    form: { type: String, enum: ['contact', 'registration', 'enquiry'], default: 'contact' },
    template: { type: String, required: true, enum: templateKeys },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    message: { type: String, trim: true, maxlength: 2000 },
    phone: { type: String, trim: true, maxlength: 30 },
    organisation: { type: String, trim: true, maxlength: 100 },
    choice: { type: String, trim: true, maxlength: 60 },
    quantity: { type: Number, min: 1, max: 10_000 },
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
