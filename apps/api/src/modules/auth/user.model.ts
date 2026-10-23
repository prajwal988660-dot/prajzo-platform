import { userRoles } from '@prajzo/shared';
import { model, Schema, type HydratedDocument, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 200,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 30 },
    /** Never returned by queries unless asked for explicitly (select('+passwordHash')). */
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: userRoles, required: true, default: 'customer' },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    /** When the person agreed to the Terms and Privacy Policy while creating the account. */
    termsAcceptedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);
userSchema.index({ role: 1, createdAt: -1 });

export type UserRecord = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserRecord>;
export const UserModel = model('User', userSchema);
