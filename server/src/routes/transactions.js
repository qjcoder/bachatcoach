import express from 'express';
import Transaction from '../models/Transaction.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

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
      .sort({ date: -1 })
      .limit(Number(limit));

    res.json(transactions);
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

    const trimmedCustom = typeof customCategory === 'string' ? customCategory.trim() : '';
    if ((category === 'other' || category === 'other_income') && !trimmedCustom) {
      return res.status(400).json({ message: 'Custom category is required for Other' });
    }

    if (receiptImage && receiptImage.length > 6_000_000) {
      return res.status(400).json({ message: 'Receipt image is too large' });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      amount,
      category,
      paymentMethod,
      note,
      customCategory: trimmedCustom,
      date: date ? new Date(date) : new Date(),
      receiptImage: receiptImage || '',
    });

    res.status(201).json(transaction);
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
