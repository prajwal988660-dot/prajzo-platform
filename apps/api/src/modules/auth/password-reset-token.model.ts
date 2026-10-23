import { model, Schema, Types } from 'mongoose';

const passwordResetTokenSchema = new Schema({
  userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
  /** SHA-256 of the token that was emailed. The token itself is never stored. */
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: () => new Date() },
});
// MongoDB removes expired tokens by itself.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetTokenModel = model('PasswordResetToken', passwordResetTokenSchema);
