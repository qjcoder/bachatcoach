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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match query as a word / token prefix — not mid-word ("ha" ≠ "recharge"). */
function wordPrefixRegex(q) {
  return new RegExp(`(?:^|[\\s\\-_'\".,/()]+)${escapeRegex(q)}`, 'i');
}

function textMatches(haystack, qLower, prefixRx) {
  const text = String(haystack || '').trim();
  if (!text || !qLower) return false;
  if (text.toLowerCase().startsWith(qLower)) return true;
  return prefixRx.test(text);
}

function scoreText(haystack, qLower) {
  const text = String(haystack || '').trim().toLowerCase();
  if (!text || !qLower) return 0;
  if (text === qLower) return 100;
  if (text.startsWith(qLower)) return 80;
  const tokens = text.split(/[\s\-_.,/()]+/).filter(Boolean);
  if (tokens.some((tok) => tok === qLower)) return 70;
  if (tokens.some((tok) => tok.startsWith(qLower))) return 50;
  return 0;
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
    const prefixRx = wordPrefixRegex(q);

    // Broad DB prefilter (still substring) — precise word-prefix filter applied below.
    const looseRx = new RegExp(escapeRegex(q), 'i');

    const txnOr = [
      { note: looseRx },
      { category: looseRx },
      { customCategory: looseRx },
      { bankAccountName: looseRx },
      { tags: looseRx },
    ];
    if (qLower === 'receipt') {
      txnOr.push({ receiptImage: { $nin: [null, ''] } });
    }
    if (hasAmount) {
      txnOr.push({ amount: amountNum });
    }

    const contactOr = [{ name: looseRx }, { nameUr: looseRx }, { phone: looseRx }];
    if (qDigits) {
      contactOr.push({ phoneKey: new RegExp(escapeRegex(qDigits)) });
    }

    const wantEntries = (!hasAmount && q.length >= 2) || hasAmount;
    const entryFilter = hasAmount ? { amount: amountNum } : { note: looseRx };

    const [rawTxns, rawContacts, entryContacts] = await Promise.all([
      Transaction.find({ user: req.userId, $or: txnOr })
        .sort({ date: -1 })
        .limit(Math.min(limit * 4, 120))
        .select('type amount category customCategory note date receiptImage bankAccountName tags')
        .lean(),
      Contact.find({ user: req.userId, $or: contactOr })
        .select('name nameUr phone phoneKey direction isSettled dueDate entries')
        .limit(Math.min(limit * 3, 80))
        .lean(),
      wantEntries
        ? Contact.find({
            user: req.userId,
            entries: { $elemMatch: entryFilter },
          })
            .select('name direction entries')
            .limit(Math.min(limit * 3, 80))
            .lean()
        : Promise.resolve([]),
    ]);

    const contacts = rawContacts
      .map((c) => {
        const phoneDigits = phoneKey(c.phone);
        const phoneHit =
          Boolean(qDigits) &&
          (phoneDigits.includes(qDigits) || String(c.phone || '').includes(q));
        const nameScore = Math.max(scoreText(c.name, qLower), scoreText(c.nameUr, qLower));
        if (!phoneHit && nameScore <= 0) return null;
        return {
          id: String(c._id),
          name: c.name,
          nameUr: c.nameUr || '',
          phone: c.phone || '',
          direction: c.direction,
          balance: contactBalance(c),
          isSettled: Boolean(c.isSettled),
          dueDate: c.dueDate || null,
          _score: phoneHit ? 90 : nameScore,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit)
      .map(({ _score, ...rest }) => rest);

    const transactions = rawTxns
      .map((t) => {
        if (hasAmount && Number(t.amount) === amountNum) {
          return { t, score: 95 };
        }
        if (qLower === 'receipt' && t.receiptImage) {
          return { t, score: 60 };
        }
        const score = Math.max(
          scoreText(t.note, qLower),
          scoreText(t.category, qLower),
          scoreText(t.customCategory, qLower),
          scoreText(t.bankAccountName, qLower),
          ...(Array.isArray(t.tags) ? t.tags.map((tag) => scoreText(tag, qLower)) : [0])
        );
        if (score <= 0) return null;
        return { t, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ t }) => ({
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

    const matchedEntries = [];
    for (const c of entryContacts) {
      for (const entry of c.entries || []) {
        const amountHit = hasAmount && Number(entry.amount) === amountNum;
        const noteHit = !hasAmount && textMatches(entry.note, qLower, prefixRx);
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
          _score: amountHit ? 95 : scoreText(entry.note, qLower),
        });
      }
    }
    matchedEntries.sort((a, b) => b._score - a._score);

    res.json({
      transactions,
      contacts,
      entries: matchedEntries.slice(0, limit).map(({ _score, ...rest }) => rest),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
