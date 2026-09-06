import express from 'express';
import Transaction from '../models/Transaction.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

function publicReceiptRef(value) {
  if (!value || typeof value !== 'string') return '';
  if (value.startsWith('data:')) return 'legacy';
  if (value.startsWith('drive:') && value.length <= 200) return value;
  return '';
}

function acceptReceiptRef(value) {
  if (!value) return '';
  if (typeof value !== 'string') {
    const err = new Error('Invalid receipt');
    err.status = 400;
    throw err;
  }
  if (value.startsWith('data:') || value.length > 200 || !value.startsWith('drive:')) {
    const err = new Error('Receipt photos must be saved to Google Drive');
    err.status = 400;
    throw err;
  }
  return value;
}

router.get('/', async (req, res, next) => {
  try {
    const { type, month, year, category, from, to, limit = 50 } = req.query;
    const filter = { user: req.userId };

    if (type) filter.type = type;
    if (category) filter.category = category;

    if (from && to) {
      filter.date = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    } else if (month && year) {
      const m = Number(month) - 1;
      const y = Number(year);
      filter.date = {
        $gte: new Date(y, m, 1),
        $lt: new Date(y, m + 1, 1),
      };
    }

    const transactions = await Transaction.find(filter)
      .select('type amount category customCategory paymentMethod note date receiptImage')
      .sort({ date: -1 })
      .limit(Number(limit))
      .lean();

    res.json(
      transactions.map((t) => ({
        ...t,
        receiptImage: publicReceiptRef(t.receiptImage),
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.userId }).lean();
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json({
      ...transaction,
      receiptImage: publicReceiptRef(transaction.receiptImage),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, user: req.userId });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

    const { type, amount, category, paymentMethod, note, customCategory, date, receiptImage } = req.body;

    if (type != null) {
      if (!['expense', 'income', 'savings'].includes(type)) {
        return res.status(400).json({ message: 'Invalid transaction type' });
      }
      transaction.type = type;
      if (type === 'savings') transaction.category = 'savings';
    }

    if (amount != null) {
      const nextAmount = Number(amount);
      if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
        return res.status(400).json({ message: 'Enter a valid amount' });
      }
      transaction.amount = nextAmount;
    }

    if (category != null && transaction.type !== 'savings') transaction.category = category;
    if (paymentMethod != null) transaction.paymentMethod = paymentMethod;
    if (note != null) transaction.note = note;
    if (date) transaction.date = new Date(date);

    if (customCategory != null) {
      const trimmedCustom = typeof customCategory === 'string' ? customCategory.trim() : '';
      const nextCategory = category != null ? category : transaction.category;
      if ((nextCategory === 'other' || nextCategory === 'other_income') && !trimmedCustom) {
        return res.status(400).json({ message: 'Custom category is required for Other' });
      }
      transaction.customCategory = transaction.type === 'savings' ? '' : trimmedCustom;
    }

    if (receiptImage) {
      transaction.receiptImage = acceptReceiptRef(receiptImage);
    }

    await transaction.save();
    res.json({
      ...transaction.toObject(),
      receiptImage: publicReceiptRef(transaction.receiptImage),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, amount, category, paymentMethod, note, customCategory, date, receiptImage } = req.body;
    if (!type || amount == null) {
      return res.status(400).json({ message: 'Type and amount are required' });
    }
    if (!['expense', 'income', 'savings'].includes(type)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }

    const trimmedCustom = typeof customCategory === 'string' ? customCategory.trim() : '';
    const resolvedCategory = type === 'savings' ? 'savings' : category;
    if ((resolvedCategory === 'other' || resolvedCategory === 'other_income') && !trimmedCustom) {
      return res.status(400).json({ message: 'Custom category is required for Other' });
    }

    const receiptRef = acceptReceiptRef(receiptImage);

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      amount,
      category: resolvedCategory,
      paymentMethod: type === 'income' ? undefined : paymentMethod || 'cash',
      note,
      customCategory: type === 'savings' ? '' : trimmedCustom,
      date: date ? new Date(date) : new Date(),
      receiptImage: receiptRef,
    });

    res.status(201).json({
      ...transaction.toObject(),
      receiptImage: publicReceiptRef(transaction.receiptImage),
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!result) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
