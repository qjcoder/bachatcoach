import express from 'express';
import Transaction from '../models/Transaction.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const { type, month, year, category, limit = 50 } = req.query;
    const filter = { user: req.userId };

    if (type) filter.type = type;
    if (category) filter.category = category;

    if (month && year) {
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
    const { type, amount, category, paymentMethod, note, date } = req.body;
    if (!type || amount == null) {
      return res.status(400).json({ message: 'Type and amount are required' });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      amount,
      category,
      paymentMethod,
      note,
      date: date ? new Date(date) : new Date(),
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
