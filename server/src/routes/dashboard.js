import express from 'express';
import Transaction from '../models/Transaction.js';
import Contact from '../models/Contact.js';
import Goal from '../models/Goal.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

const MOTIVATION_TIPS = {
  en: [
    'Small savings today become big dreams tomorrow.',
    'Track every rupee — awareness is the first step to saving.',
    'Skip one unnecessary purchase this week and move that amount to savings.',
    'A budget is telling your money where to go, not wondering where it went.',
    'Your future self will thank you for saving today.',
    'Cut one subscription you rarely use — that is free money back.',
    'Cook at home twice this week and watch your food budget shrink.',
  ],
  ur: [
    'آج کی چھوٹی بچت کل کے بڑے خواب بناتی ہے۔',
    'ہر روپیہ لکھیں — بچت کی پہلی سیڑھی شعور ہے۔',
    'اس ہفتے ایک غیر ضروری خریداری چھوڑیں اور رقم بچت میں ڈالیں۔',
    'بجٹ یہ بتاتا ہے پیسہ کہاں جانا ہے، نہ کہ کہاں گیا۔',
    'آج کی بچت پر کل کا آپ شکر گزار ہوگا۔',
    'ایک سبسکرپشن منسوخ کریں جو شاید استعمال نہ کریں۔',
    'اس ہفتے دو بار گھر کا کھانا بنائیں، خوراک کا بجٹ کم ہوگا۔',
  ],
};

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

    const lang = req.query.lang === 'ur' ? 'ur' : 'en';
    const tips = MOTIVATION_TIPS[lang];
    const tipOfDay = tips[new Date().getDate() % tips.length];

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
        tip: tipOfDay,
      },
      savingsOpportunity,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
