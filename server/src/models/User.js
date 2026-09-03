import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BACKUP_FREQUENCIES = ['off', 'daily', 'weekly', 'monthly', 'yearly'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameUr: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
      type: String,
      minlength: 6,
      required: function passwordRequired() {
        return !this.googleId;
      },
    },
    googleId: { type: String, unique: true, sparse: true, trim: true },
    language: { type: String, default: 'en', trim: true, maxlength: 12 },
    currency: { type: String, default: 'PKR' },
    salaryDay: { type: Number, min: 1, max: 31, default: 1 },
    avatar: { type: String, default: '' },
    backupEnabled: { type: Boolean, default: false },
    backupFrequency: {
      type: String,
      enum: BACKUP_FREQUENCIES,
      default: 'off',
    },
    lastBackupAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

/** Random password for Google/OTP-only accounts (never used for login). */
export function randomUnusedPassword() {
  return crypto.randomBytes(32).toString('hex');
}

export { BACKUP_FREQUENCIES };
export default mongoose.model('User', userSchema);
