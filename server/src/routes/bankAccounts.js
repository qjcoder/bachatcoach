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

async function paymentBalances(userId, accounts) {
  const userOid = new mongoose.Types.ObjectId(userId);
  const accountIds = accounts.map((a) => a._id);
  const nameToId = new Map(
    accounts.map((a) => [String(a.name || '').trim().toLowerCase(), String(a._id)])
  );

  const [cashRow, byIdRows, byNameRows] = await Promise.all([
    // Cash wallet: explicit cash, or no bank link
    Transaction.aggregate([
      {
        $match: {
          user: userOid,
          $and: [
            {
              $or: [{ paymentMethod: 'cash' }, { paymentMethod: { $exists: false } }, { paymentMethod: null }],
            },
            {
              $or: [{ bankAccount: null }, { bankAccount: { $exists: false } }],
            },
          ],
        },
      },
      { $group: { _id: null, balance: { $sum: signedAmountExpr() } } },
    ]),
    // Linked bank account id (income/expense/savings into that account)
    accountIds.length
      ? Transaction.aggregate([
          {
            $match: {
              user: userOid,
              bankAccount: { $in: accountIds },
            },
          },
          { $group: { _id: '$bankAccount', balance: { $sum: signedAmountExpr() } } },
        ])
      : Promise.resolve([]),
    // Legacy rows: bank payment with name snapshot but missing live ref
    Transaction.aggregate([
      {
        $match: {
          user: userOid,
          paymentMethod: { $in: ['bank', 'jazzcash', 'easypaisa', 'card'] },
          $or: [{ bankAccount: null }, { bankAccount: { $exists: false } }],
          bankAccountName: { $type: 'string', $ne: '' },
        },
      },
      {
        $group: {
          _id: { $toLower: { $trim: { input: '$bankAccountName' } } },
          balance: { $sum: signedAmountExpr() },
        },
      },
    ]),
  ]);

  const byAccount = new Map(accountIds.map((id) => [String(id), 0]));

  for (const row of byIdRows) {
    const key = String(row._id);
    byAccount.set(key, (byAccount.get(key) || 0) + (Number(row.balance) || 0));
  }

  for (const row of byNameRows) {
    const id = nameToId.get(String(row._id || '').trim().toLowerCase());
    if (!id) continue;
    // Skip if already counted via live bankAccount id for same name — name rows have null id only
    byAccount.set(id, (byAccount.get(id) || 0) + (Number(row.balance) || 0));
  }

  return {
    cashBalance: Number(cashRow[0]?.balance) || 0,
    byAccount,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const accounts = await BankAccount.find({ user: req.userId }).sort({ name: 1 }).lean();
    const balances = await paymentBalances(req.userId, accounts);

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
