import express from 'express';
import Transaction from '../models/Transaction.js';
import Contact from '../models/Contact.js';
import { auth } from '../middleware/auth.js';
import { phoneKey } from '../lib/phone.js';

const router = express.Router();

router.use(auth);

function contactBalance(c) {
  let total = 0;
  for (const entry of c.entries || []) {
    if (c.direction === 'i_lent') {
      if (entry.type === 'lent') total += entry.amount;
      if (entry.type === 'repaid') total -= entry.amount;
    } else {
      if (entry.type === 'received') total += entry.amount;
      if (entry.type === 'paid_back') total -= entry.amount;
    }
  }
  return total;
}

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 1) {
      return res.json({ transactions: [], contacts: [], entries: [] });
    }

    const qLower = q.toLowerCase();
    const qDigits = phoneKey(q);
    const amountNum = Number(q.replace(/,/g, ''));
    const hasAmount = Number.isFinite(amountNum) && amountNum > 0 && /^\d/.test(q.trim());
    const limit = Math.min(Number(req.query.limit) || 40, 80);

    const [txns, contacts] = await Promise.all([
      Transaction.find({ user: req.userId })
        .sort({ date: -1 })
        .limit(400)
        .lean(),
      Contact.find({ user: req.userId })
        .select('name nameUr phone phoneKey direction isSettled dueDate entries')
        .lean(),
    ]);

    const transactions = txns
      .filter((t) => {
        const note = String(t.note || '').toLowerCase();
        const category = String(t.category || '').toLowerCase();
        const custom = String(t.customCategory || '').toLowerCase();
        const bank = String(t.bankAccountName || '').toLowerCase();
        const tags = (t.tags || []).join(' ').toLowerCase();
        const receipt = String(t.receiptImage || '');
        if (
          note.includes(qLower) ||
          category.includes(qLower) ||
          custom.includes(qLower) ||
          bank.includes(qLower) ||
          tags.includes(qLower)
        ) {
          return true;
        }
        if (qLower === 'receipt' && receipt) return true;
        if (hasAmount && Number(t.amount) === amountNum) return true;
        if (hasAmount && String(t.amount).includes(String(amountNum))) return true;
        return false;
      })
      .slice(0, limit)
      .map((t) => ({
        id: String(t._id),
        type: t.type,
        amount: t.amount,
        category: t.category || '',
        customCategory: t.customCategory || '',
        note: t.note || '',
        date: t.date,
        hasReceipt: Boolean(t.receiptImage),
        bankAccountName: t.bankAccountName || '',
      }));

    const matchedContacts = [];
    const matchedEntries = [];

    for (const c of contacts) {
      const name = `${c.name || ''} ${c.nameUr || ''}`.toLowerCase();
      const phone = String(c.phone || '').toLowerCase();
      const key = c.phoneKey || phoneKey(c.phone);
      const nameHit =
        name.includes(qLower) ||
        phone.includes(qLower) ||
        (qDigits && key.includes(qDigits));

      if (nameHit) {
        matchedContacts.push({
          id: String(c._id),
          name: c.name,
          nameUr: c.nameUr || '',
          phone: c.phone || '',
          direction: c.direction,
          balance: contactBalance(c),
          isSettled: Boolean(c.isSettled),
          dueDate: c.dueDate || null,
        });
      }

      for (const entry of c.entries || []) {
        const note = String(entry.note || '').toLowerCase();
        const amountHit = hasAmount && Number(entry.amount) === amountNum;
        const noteHit = Boolean(qLower) && note.includes(qLower);
        if (!noteHit && !amountHit) continue;
        matchedEntries.push({
          id: String(entry._id),
          contactId: String(c._id),
          contactName: c.name,
          direction: c.direction,
          type: entry.type,
          amount: entry.amount,
          note: entry.note || '',
          date: entry.date,
        });
      }
    }

    res.json({
      transactions,
      contacts: matchedContacts.slice(0, limit),
      entries: matchedEntries.slice(0, limit),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
