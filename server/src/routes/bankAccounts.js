import express from 'express';
import BankAccount from '../models/BankAccount.js';
import Transaction from '../models/Transaction.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

router.get('/', async (req, res, next) => {
  try {
    const accounts = await BankAccount.find({ user: req.userId }).sort({ name: 1 }).lean();
    res.json(accounts);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) return res.status(400).json({ message: 'Account name is required' });

    const account = await BankAccount.create({
      user: req.userId,
      name,
    });
    res.status(201).json(account);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'You already have an account with this name' });
    }
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const name = normalizeName(req.body?.name);
    if (!name) return res.status(400).json({ message: 'Account name is required' });

    const account = await BankAccount.findOne({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ message: 'Bank account not found' });

    account.name = name;
    await account.save();

    // Keep transaction snapshots in sync with the renamed account.
    await Transaction.updateMany(
      { user: req.userId, bankAccount: account._id },
      { $set: { bankAccountName: account.name } }
    );

    res.json(account);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: 'You already have an account with this name' });
    }
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const account = await BankAccount.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ message: 'Bank account not found' });

    // Keep historical name on transactions; drop the live ref.
    await Transaction.updateMany(
      { user: req.userId, bankAccount: account._id },
      { $unset: { bankAccount: 1 } }
    );

    res.json({ message: 'Deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
