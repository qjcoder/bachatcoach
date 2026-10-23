import express from 'express';
import mongoose from 'mongoose';
import BankAccount from '../models/BankAccount.js';
import Transaction from '../models/Transaction.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
router.use(auth);

function normalizeName(value) {
  return typeof value === 'string' ? value.trim().slice(0, 80) : '';
}

/** Income adds; expense + savings subtract. */
function signedAmountExpr() {
  return {
    $cond: [
      { $eq: ['$type', 'income'] },
      '$amount',
      { $multiply: ['$amount', -1] },
    ],
  };
}

async function paymentBalances(userId) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const [cashRow, bankRows] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: userOid, paymentMethod: 'cash' } },
      { $group: { _id: null, balance: { $sum: signedAmountExpr() } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          user: userOid,
          paymentMethod: 'bank',
          bankAccount: { $ne: null },
        },
      },
      { $group: { _id: '$bankAccount', balance: { $sum: signedAmountExpr() } } },
    ]),
  ]);

  const byAccount = new Map(
    bankRows.map((row) => [String(row._id), Number(row.balance) || 0])
  );
  return {
    cashBalance: Number(cashRow[0]?.balance) || 0,
    byAccount,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const [accounts, balances] = await Promise.all([
      BankAccount.find({ user: req.userId }).sort({ name: 1 }).lean(),
      paymentBalances(req.userId),
    ]);

    res.json({
      cashBalance: balances.cashBalance,
      accounts: accounts.map((account) => ({
        ...account,
        balance: balances.byAccount.get(String(account._id)) || 0,
      })),
    });
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
    res.status(201).json({ ...account.toObject(), balance: 0 });
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
