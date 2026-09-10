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
  'savings', // legacy; new deposits use type: 'savings'
  'other',
];

export const PAYMENT_METHODS = ['cash', 'bank', 'jazzcash', 'easypaisa', 'card']; // jazzcash/easypaisa/card = legacy; UI offers cash + bank only

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['expense', 'income', 'savings'], required: true },
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      enum: [...EXPENSE_CATEGORIES, 'salary', 'freelance', 'gift', 'investment', 'other_income'],
    },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'cash' },
    /** Live link to user's bank account (optional). */
    bankAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', default: null },
    /** Snapshot of account name at save time (survives rename/delete). */
    bankAccountName: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },
    customCategory: { type: String, trim: true, default: '' },
    date: { type: Date, required: true, default: Date.now, index: true },
    receiptImage: { type: String, default: '' },
    /** When true, surface this txn as a monthly repeat suggestion. */
    recurringMonthly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1, date: -1 });
transactionSchema.index({ user: 1, recurringMonthly: 1, date: -1 });

export default mongoose.model('Transaction', transactionSchema);
