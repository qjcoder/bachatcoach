import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    nameKey: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  },
  { timestamps: true }
);

bankAccountSchema.index({ user: 1, nameKey: 1 }, { unique: true });

bankAccountSchema.pre('validate', function setNameKey() {
  this.nameKey = String(this.name || '')
    .trim()
    .toLowerCase();
});

export default mongoose.model('BankAccount', bankAccountSchema);
