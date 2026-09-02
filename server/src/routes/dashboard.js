import express from 'express';
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

router.get('/summary', async (req, res, next) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();
    const { start, end } = monthRange(month, year);

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevRange = monthRange(prevMonth, prevYear);

    const [current, previous, lentContacts, borrowedContacts, goals] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: req.userId,
            date: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            user: req.userId,
            date: { $gte: prevRange.start, $lt: prevRange.end },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Contact.find({ user: req.userId, direction: 'i_lent', isSettled: false }),
      Contact.find({ user: req.userId, direction: 'i_borrowed', isSettled: false }),
      Goal.find({ user: req.userId, isCompleted: false }),
    ]);

    const income = current.find((r) => r._id === 'income')?.total || 0;
    const expenses = current.find((r) => r._id === 'expense')?.total || 0;
    const prevIncome = previous.find((r) => r._id === 'income')?.total || 0;
    const prevExpenses = previous.find((r) => r._id === 'expense')?.total || 0;
    const saved = income - expenses;
    const prevSaved = prevIncome - prevExpenses;
    const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: req.userId,
          type: 'expense',
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const lang = req.query.lang === 'ur' ? 'ur' : 'en'; // roman uses English quotes & tips
    const dailyQuote = getDailyQuote(lang);

    const totalLent = lentContacts.reduce((sum, c) => sum + (c.balance || 0), 0);
    const totalBorrowed = borrowedContacts.reduce((sum, c) => sum + (c.balance || 0), 0);

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
      saved,
      savingsRate,
      vsLastMonth: {
        income: income - prevIncome,
        expenses: expenses - prevExpenses,
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
    const year = Number(req.query.year) || new Date().getFullYear();

    const rows = await Transaction.aggregate([
      {
        $match: {
          user: req.userId,
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
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const income = rows.find((r) => r._id.month === month && r._id.type === 'income')?.total || 0;
      const expenses = rows.find((r) => r._id.month === month && r._id.type === 'expense')?.total || 0;
      return { month, income, expenses, saved: income - expenses };
    });

    const totals = months.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expenses: acc.expenses + m.expenses,
        saved: acc.saved + m.saved,
      }),
      { income: 0, expenses: 0, saved: 0 }
    );

    res.json({ year, months, totals });
  } catch (err) {
    next(err);
  }
});

export default router;
