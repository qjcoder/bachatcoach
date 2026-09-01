import mongoose from 'mongoose';

export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'bills',
  'rent',
  'shopping',
  'health',
  'entertainment',
  'education',
  'subscriptions',
  'personal',
  'savings',
  'other',
];

export const PAYMENT_METHODS = ['cash', 'bank', 'jazzcash', 'easypaisa', 'card'];

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['expense', 'income'], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: [...EXPENSE_CATEGORIES, 'salary', 'freelance', 'gift', 'investment', 'other_income'],
    },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    note: { type: String, trim: true, default: '' },
    date: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });

export default mongoose.model('Transaction', transactionSchema);
