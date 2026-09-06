import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Contact from '../models/Contact.js';
import Goal from '../models/Goal.js';
import { auth } from '../middleware/auth.js';
import { getDailyQuote } from '../data/dailyQuotes.js';

const router = express.Router();

router.use(auth);

function monthRange(month, year) {
  const m = Number(month) - 1;
  const y = Number(year);
  return {
    start: new Date(y, m, 1),
    end: new Date(y, m + 1, 1),
  };
}

/** Aggregate $match does not cast string JWT ids to ObjectId. */
function userObjectId(req) {
  return new mongoose.Types.ObjectId(req.userId);
}

/** Lean docs have no virtual `balance` — compute from entries. */
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

/** True spending (excludes legacy expense+category savings). */
function isSpendingExpense(doc) {
  return doc.type === 'expense' && doc.category !== 'savings';
}

/** Savings deposit: new type or legacy expense marked savings. */
function isSavingsTransfer(doc) {
  return doc.type === 'savings' || (doc.type === 'expense' && doc.category === 'savings');
}

function sumByKind(rows) {
  let income = 0;
  let expenses = 0;
  let toSavings = 0;
  for (const r of rows) {
    if (r.type === 'income') income += r.amount;
    else if (isSavingsTransfer(r)) toSavings += r.amount;
    else if (isSpendingExpense(r)) expenses += r.amount;
  }
  return { income, expenses, toSavings };
}

router.get('/summary', async (req, res, next) => {
  try {
    const userId = userObjectId(req);
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();
    const { start, end } = monthRange(month, year);

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevRange = monthRange(prevMonth, prevYear);

    const [txFacet, lentContacts, borrowedContacts, goals] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: prevRange.start, $lt: end },
          },
        },
        {
          $facet: {
            current: [
              { $match: { date: { $gte: start, $lt: end } } },
              { $project: { type: 1, category: 1, amount: 1 } },
            ],
            previous: [
              { $match: { date: { $gte: prevRange.start, $lt: prevRange.end } } },
              { $project: { type: 1, category: 1, amount: 1 } },
            ],
            categoryBreakdown: [
              {
                $match: {
                  type: 'expense',
                  category: { $ne: 'savings' },
                  date: { $gte: start, $lt: end },
                },
              },
              { $group: { _id: '$category', total: { $sum: '$amount' } } },
              { $sort: { total: -1 } },
            ],
          },
        },
      ]),
      Contact.find({ user: req.userId, direction: 'i_lent', isSettled: false })
        .select('direction entries')
        .lean(),
      Contact.find({ user: req.userId, direction: 'i_borrowed', isSettled: false })
        .select('direction entries')
        .lean(),
      Goal.find({ user: req.userId, isCompleted: false }).lean(),
    ]);

    const facet = txFacet[0] || {};
    const current = sumByKind(facet.current || []);
    const previous = sumByKind(facet.previous || []);
    const categoryBreakdown = facet.categoryBreakdown || [];

    const { income, expenses, toSavings } = current;
    const saved = income - expenses;
    const prevSaved = previous.income - previous.expenses;
    const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

    const lang = req.query.lang === 'ur' ? 'ur' : 'en';
    const dailyQuote = getDailyQuote(lang);

    const totalLent = lentContacts.reduce((sum, c) => sum + contactBalance(c), 0);
    const totalBorrowed = borrowedContacts.reduce((sum, c) => sum + contactBalance(c), 0);

    const topCategory = categoryBreakdown[0];
    const savingsOpportunity = topCategory
      ? {
          category: topCategory._id,
          amount: topCategory.total,
          suggestion:
            lang === 'ur'
              ? `${topCategory._id} پر سب سے زیادہ خرچ — 10% کم کریں تو ~₨${Math.round(topCategory.total * 0.1)} بچ سکتے ہیں`
              : `Highest spend on ${topCategory._id} — cut 10% to save ~₨${Math.round(topCategory.total * 0.1)}`,
        }
      : null;

    res.json({
      month,
      year,
      income,
      expenses,
      toSavings,
      saved,
      savingsRate,
      vsLastMonth: {
        income: income - previous.income,
        expenses: expenses - previous.expenses,
        toSavings: toSavings - previous.toSavings,
        saved: saved - prevSaved,
      },
      categoryBreakdown,
      loans: {
        totalLent,
        totalBorrowed,
        lentCount: lentContacts.length,
        borrowedCount: borrowedContacts.length,
      },
      goals,
      motivation: {
        tip: dailyQuote.text,
        source: dailyQuote.source,
      },
      savingsOpportunity,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/monthly-report', async (req, res, next) => {
  try {
    const userId = userObjectId(req);
    const year = Number(req.query.year) || new Date().getFullYear();

    const rows = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$date' },
            type: '$type',
            category: '$category',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthRows = rows.filter((r) => r._id.month === month);
      let income = 0;
      let expenses = 0;
      let toSavings = 0;
      for (const r of monthRows) {
        const doc = { type: r._id.type, category: r._id.category, amount: r.total };
        if (doc.type === 'income') income += doc.amount;
        else if (isSavingsTransfer(doc)) toSavings += doc.amount;
        else if (isSpendingExpense(doc)) expenses += doc.amount;
      }
      return { month, income, expenses, toSavings, saved: income - expenses };
    });

    const totals = months.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expenses: acc.expenses + m.expenses,
        toSavings: acc.toSavings + m.toSavings,
        saved: acc.saved + m.saved,
      }),
      { income: 0, expenses: 0, toSavings: 0, saved: 0 }
    );

    res.json({ year, months, totals });
  } catch (err) {
    next(err);
  }
});

export default router;
