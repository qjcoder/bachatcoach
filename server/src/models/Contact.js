import mongoose from 'mongoose';
import { phoneKey } from '../lib/phone.js';

const loanEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['lent', 'received', 'repaid', 'paid_back'], required: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: '' },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const contactSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    nameUr: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    phoneKey: { type: String, trim: true, default: '', index: true },
    direction: { type: String, enum: ['i_lent', 'i_borrowed'], required: true },
    entries: [loanEntrySchema],
    isSettled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

contactSchema.virtual('balance').get(function balance() {
  let total = 0;
  for (const entry of this.entries) {
    if (this.direction === 'i_lent') {
      if (entry.type === 'lent') total += entry.amount;
      if (entry.type === 'repaid') total -= entry.amount;
    } else {
      if (entry.type === 'received') total += entry.amount;
      if (entry.type === 'paid_back') total -= entry.amount;
    }
  }
  return total;
});

contactSchema.set('toJSON', { virtuals: true });
contactSchema.set('toObject', { virtuals: true });

contactSchema.index({ user: 1, isSettled: 1, direction: 1 });
contactSchema.index({ user: 1, phoneKey: 1 });

contactSchema.pre('validate', function setPhoneKey() {
  this.phoneKey = phoneKey(this.phone);
});

export default mongoose.model('Contact', contactSchema);
