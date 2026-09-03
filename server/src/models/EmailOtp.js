import mongoose from 'mongoose';
import crypto from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

const emailOtpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['login', 'register'], required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export function hashOtpCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function otpExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MS);
}

export { OTP_TTL_MS, RESEND_COOLDOWN_MS, MAX_ATTEMPTS };
export default mongoose.model('EmailOtp', emailOtpSchema);
