import express from 'express';
import mongoose from 'mongoose';
import { auth } from '../middleware/auth.js';
import User, { BACKUP_FREQUENCIES } from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Contact from '../models/Contact.js';
import Goal from '../models/Goal.js';
import { phoneKey } from '../lib/phone.js';

const router = express.Router();
router.use(auth);

const BACKUP_VERSION = 1;

function userObjectId(req) {
  return new mongoose.Types.ObjectId(req.userId);
}

router.get('/export', async (req, res, next) => {
  try {
    // Builds a JSON snapshot for the *client* to upload to the user's Google Drive.
    // This payload is never written back to MongoDB as a backup document.
    const userId = userObjectId(req);
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const [transactions, contacts, goals] = await Promise.all([
      Transaction.find({ user: userId }).lean(),
      Contact.find({ user: userId }).lean(),
      Goal.find({ user: userId }).lean(),
    ]);

    const strip = (doc) => {
      const { _id, user: _u, __v, ...rest } = doc;
      return { ...rest, id: String(_id) };
    };

    res.json({
      version: BACKUP_VERSION,
      app: 'BachatCoach',
      exportedAt: new Date().toISOString(),
      user: {
        name: user.name,
        nameUr: user.nameUr || '',
        email: user.email,
        language: user.language,
        currency: user.currency,
        salaryDay: user.salaryDay,
        avatar: user.avatar || '',
        backupEnabled: user.backupEnabled,
        backupFrequency: user.backupFrequency,
      },
      transactions: transactions.map((t) => ({
        ...strip(t),
        receiptImage: typeof t.receiptImage === 'string' && t.receiptImage.startsWith('drive:') ? t.receiptImage : '',
      })),
      contacts: contacts.map((c) => {
        const base = strip(c);
        return {
          ...base,
          entries: (c.entries || []).map((e) => ({
            type: e.type,
            amount: e.amount,
            note: e.note || '',
            date: e.date,
          })),
        };
      }),
      goals: goals.map(strip),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/restore', async (req, res, next) => {
  try {
    const payload = req.body;
    if (!payload || payload.app !== 'BachatCoach' || !Array.isArray(payload.transactions)) {
      return res.status(400).json({ message: 'Invalid backup file' });
    }

    const userId = userObjectId(req);
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Transaction.deleteMany({ user: userId });
    await Contact.deleteMany({ user: userId });
    await Goal.deleteMany({ user: userId });

    const txs = (payload.transactions || []).map((t) => ({
      user: userId,
      type: t.type,
      amount: t.amount,
      category: t.category,
      paymentMethod: t.paymentMethod || 'cash',
      note: t.note || '',
      customCategory: t.customCategory || '',
      date: t.date ? new Date(t.date) : new Date(),
      receiptImage:
        typeof t.receiptImage === 'string' && t.receiptImage.startsWith('drive:') ? t.receiptImage : '',
    }));
    if (txs.length) await Transaction.insertMany(txs);

    const contacts = (payload.contacts || []).map((c) => ({
      user: userId,
      name: c.name,
      nameUr: c.nameUr || '',
      phone: c.phone || '',
      phoneKey: phoneKey(c.phone),
      direction: c.direction,
      entries: (c.entries || []).map((e) => ({
        type: e.type,
        amount: e.amount,
        note: e.note || '',
        date: e.date ? new Date(e.date) : new Date(),
      })),
      isSettled: Boolean(c.isSettled),
    }));
    if (contacts.length) await Contact.insertMany(contacts);

    const goals = (payload.goals || []).map((g) => ({
      user: userId,
      title: g.title,
      titleUr: g.titleUr || '',
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount || 0,
      deadline: g.deadline ? new Date(g.deadline) : undefined,
      icon: g.icon || 'target',
      isCompleted: Boolean(g.isCompleted),
    }));
    if (goals.length) await Goal.insertMany(goals);

    if (payload.user) {
      if (payload.user.language) user.language = payload.user.language;
      if (payload.user.currency) user.currency = String(payload.user.currency).toUpperCase();
      if (payload.user.salaryDay) user.salaryDay = payload.user.salaryDay;
      if (payload.user.name) user.name = payload.user.name;
      if (payload.user.nameUr !== undefined) user.nameUr = payload.user.nameUr || '';
      if (payload.user.avatar !== undefined) user.avatar = payload.user.avatar || '';
      await user.save();
    }

    res.json({
      message: 'Restore complete',
      counts: {
        transactions: (payload.transactions || []).length,
        contacts: (payload.contacts || []).length,
        goals: (payload.goals || []).length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const { backupEnabled, backupFrequency, lastBackupAt } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (typeof backupEnabled === 'boolean') user.backupEnabled = backupEnabled;
    if (backupFrequency !== undefined) {
      if (!BACKUP_FREQUENCIES.includes(backupFrequency)) {
        return res.status(400).json({ message: 'Invalid backup frequency' });
      }
      user.backupFrequency = backupFrequency;
      if (backupFrequency === 'off') user.backupEnabled = false;
      else if (backupEnabled === undefined) user.backupEnabled = true;
    }
    if (lastBackupAt !== undefined) {
      user.lastBackupAt = lastBackupAt ? new Date(lastBackupAt) : null;
    }

    await user.save();
    res.json({
      backupEnabled: user.backupEnabled,
      backupFrequency: user.backupFrequency,
      lastBackupAt: user.lastBackupAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
