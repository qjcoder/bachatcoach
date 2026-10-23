import express from 'express';
import mongoose from 'mongoose';
import Transaction from '../models/Transaction.js';
import Contact from '../models/Contact.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { getDailyQuote } from '../data/dailyQuotes.js';

const router = express.Router();

router.use(auth);

/** Default for old Play Store builds that omit from/to / tz (BachatCoach is PK-first). */
const DEFAULT_TZ = 'Asia/Karachi';

function parseIsoDate(value) {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeTimeZone(value) {
  if (typeof value !== 'string' || !value) return DEFAULT_TZ;
  if (!/^[A-Za-z0-9_+\-/]+$/.test(value) || value.length > 64) return DEFAULT_TZ;
  return value;
}

function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });
  const out = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return out;
}

/** Offset of `timeZone` at `date` (ms to add to local wall time to get UTC… inverted below). */
function timezoneOffsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

/** Wall clock in `timeZone` → UTC Date (handles fixed offsets like Asia/Karachi). */
function zonedLocalToUtc(year, month, day, hour, minute, second, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let instant = new Date(utcGuess);
  instant = new Date(utcGuess - timezoneOffsetMs(instant, timeZone));
  instant = new Date(utcGuess - timezoneOffsetMs(instant, timeZone));
  return instant;
}

/** Calendar month in timezone → [start, end) UTC instants. */
function monthRangeInTz(month, year, timeZone = DEFAULT_TZ) {
  const start = zonedLocalToUtc(year, month, 1, 0, 0, 0, timeZone);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = zonedLocalToUtc(nextYear, nextMonth, 1, 0, 0, 0, timeZone);
  return { start, end };
}

function nowCalendarInTz(timeZone = DEFAULT_TZ) {
  const p = zonedParts(new Date(), timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

/**
 * Prefer client local bounds (from/to).
 * Old apps omit them → Asia/Karachi month so Play Store installs get correct PK totals.
 */
function resolvePeriod(req) {
  const tz = safeTimeZone(req.query.tz);
  const nowCal = nowCalendarInTz(tz);
  const month = Number(req.query.month) || nowCal.month;
  const year = Number(req.query.year) || nowCal.year;
  const fallback = monthRangeInTz(month, year, tz);
  const start = parseIsoDate(req.query.from) || fallback.start;
  const endInclusive = parseIsoDate(req.query.to);
  // Client sends inclusive end-of-day; fallback uses $lt next month start.
  const useInclusiveEnd = Boolean(endInclusive);
  const end = endInclusive || fallback.end;

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevFallback = monthRangeInTz(prevMonth, prevYear, tz);
  const prevStart = parseIsoDate(req.query.prevFrom) || prevFallback.start;
  const prevEndRaw = parseIsoDate(req.query.prevTo);
  const prevUseInclusiveEnd = Boolean(prevEndRaw);
  const prevEnd = prevEndRaw || prevFallback.end;

  return {
    month,
    year,
    tz,
    start,
    end,
    useInclusiveEnd,
    prevStart,
    prevEnd,
    prevUseInclusiveEnd,
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

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

router.get('/summary', async (req, res, next) => {
  try {
    const userId = userObjectId(req);
    const now = new Date();
    const {
      month,
      year,
      start,
      end,
      useInclusiveEnd,
      prevStart,
      prevEnd,
      prevUseInclusiveEnd,
    } = resolvePeriod(req);

    const currentDateMatch = useInclusiveEnd
      ? { date: { $gte: start, $lte: end } }
      : { date: { $gte: start, $lt: end } };
    const previousDateMatch = prevUseInclusiveEnd
      ? { date: { $gte: prevStart, $lte: prevEnd } }
      : { date: { $gte: prevStart, $lt: prevEnd } };
    const spanEnd = useInclusiveEnd ? end : end;
    const spanMatch = {
      date: {
        $gte: prevStart,
        ...(useInclusiveEnd ? { $lte: spanEnd } : { $lt: spanEnd }),
      },
    };

    const [txFacet, openContacts, goals, userDoc, recurringTemplates] =
      await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            ...spanMatch,
          },
        },
        {
          $facet: {
            current: [
              { $match: currentDateMatch },
              { $project: { type: 1, category: 1, amount: 1 } },
            ],
            previous: [
              { $match: previousDateMatch },
              { $project: { type: 1, category: 1, amount: 1 } },
            ],
            categoryBreakdown: [
              {
                $match: {
                  type: 'expense',
                  category: { $ne: 'savings' },
                  ...currentDateMatch,
                },
              },
              { $group: { _id: '$category', total: { $sum: '$amount' } } },
              { $sort: { total: -1 } },
            ],
            incomeCategoryBreakdown: [
              {
                $match: {
                  type: 'income',
                  ...currentDateMatch,
                },
              },
              { $group: { _id: '$category', total: { $sum: '$amount' } } },
              { $sort: { total: -1 } },
            ],
            recent: [
              { $match: currentDateMatch },
              { $sort: { date: -1 } },
              { $limit: 4 },
              {
                $project: {
                  type: 1,
                  category: 1,
                  customCategory: 1,
                  amount: 1,
                  note: 1,
                  date: 1,
                },
              },
            ],
            salaryThisMonth: [
              {
                $match: {
                  type: 'income',
                  category: 'salary',
                  ...currentDateMatch,
                },
              },
              { $limit: 1 },
              { $project: { _id: 1 } },
            ],
            monthKeys: [
              { $match: currentDateMatch },
              {
                $project: {
                  key: {
                    $concat: [
                      '$type',
                      '|',
                      { $ifNull: ['$category', ''] },
                      '|',
                      { $ifNull: ['$customCategory', ''] },
                      '|',
                      { $toString: '$amount' },
                      '|',
                      { $toLower: { $trim: { input: { $ifNull: ['$note', ''] } } } },
                    ],
                  },
                },
              },
              { $group: { _id: '$key' } },
            ],
          },
        },
      ]),
      Contact.find({
        user: req.userId,
        isSettled: false,
        direction: { $in: ['i_lent', 'i_borrowed'] },
      })
        .select('direction entries')
        .lean(),
      Goal.find({ user: req.userId, isCompleted: false })
        .select('_id title targetAmount currentAmount isCompleted')
        .lean(),
      User.findById(req.userId).select('salaryDay').lean(),
      Transaction.find({
        user: req.userId,
        recurringMonthly: true,
        date: { $lt: start },
      })
        .sort({ date: -1 })
        .limit(24)
        .select('type category customCategory amount note paymentMethod')
        .lean(),
    ]);

    const facet = txFacet[0] || {};
    const current = sumByKind(facet.current || []);
    const previous = sumByKind(facet.previous || []);
    const categoryBreakdown = facet.categoryBreakdown || [];
    const incomeCategoryBreakdown = facet.incomeCategoryBreakdown || [];
    const recentTransactions = facet.recent || [];

    const { income, expenses, toSavings } = current;
    const saved = income - expenses;
    const prevSaved = previous.income - previous.expenses;
    const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

    const lang = req.query.lang === 'ur' ? 'ur' : 'en';
    const dailyQuote = getDailyQuote(lang);

    const lentContacts = (openContacts || []).filter((c) => c.direction === 'i_lent');
    const borrowedContacts = (openContacts || []).filter((c) => c.direction === 'i_borrowed');
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

    const suggestions = [];
    const salaryDay = Number(userDoc?.salaryDay) || 1;
    const today = now.getDate();
    const dayDiff = Math.abs(today - salaryDay);
    const nearSalary = dayDiff <= 2 || (salaryDay >= 28 && today >= 28);
    const hasSalaryThisMonth = (facet.salaryThisMonth || []).length > 0;
    if (nearSalary && !hasSalaryThisMonth) {
      suggestions.push({
        id: 'salary',
        kind: 'salary',
        title: lang === 'ur' ? 'تنخواہ درج کریں؟' : 'Log salary?',
        subtitle:
          lang === 'ur'
            ? `آج کے قریب آپ کا تنخواہ دن (${salaryDay}) ہے`
            : `Your salary day (${salaryDay}) is near`,
        type: 'income',
        category: 'salary',
        amount: null,
      });
    }

    const seenKeys = new Set();
    const thisMonthKeys = new Set((facet.monthKeys || []).map((row) => row._id).filter(Boolean));
    for (const tmpl of recurringTemplates || []) {
      const key = `${tmpl.type}|${tmpl.category || ''}|${tmpl.customCategory || ''}|${Number(tmpl.amount)}|${String(tmpl.note || '').trim().toLowerCase()}`;
      if (seenKeys.has(key) || thisMonthKeys.has(key)) continue;
      seenKeys.add(key);
      suggestions.push({
        id: `recurring-${key}`,
        kind: 'recurring',
        title:
          lang === 'ur'
            ? 'ماہانہ دہرائی'
            : 'Monthly repeat',
        subtitle: String(tmpl.note || tmpl.customCategory || tmpl.category || '').trim() || undefined,
        type: tmpl.type,
        category: tmpl.category || '',
        customCategory: tmpl.customCategory || '',
        amount: tmpl.amount,
        note: tmpl.note || '',
        paymentMethod: tmpl.paymentMethod || 'cash',
      });
      if (suggestions.length >= 5) break;
    }

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
        incomePct: pctChange(income, previous.income),
        expensesPct: pctChange(expenses, previous.expenses),
        savedPct: pctChange(saved, prevSaved),
      },
      categoryBreakdown,
      incomeCategoryBreakdown,
      recentTransactions,
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
      suggestions,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/monthly-report', async (req, res, next) => {
  try {
    const userId = userObjectId(req);
    const tz = safeTimeZone(req.query.tz);
    const year = Number(req.query.year) || nowCalendarInTz(tz).year;
    // Local calendar year in tz (padded) so Dec 31 evening PK isn't dropped.
    const yearStart =
      parseIsoDate(req.query.from) || zonedLocalToUtc(year, 1, 1, 0, 0, 0, tz);
    const yearEnd =
      parseIsoDate(req.query.to) || zonedLocalToUtc(year + 1, 1, 1, 0, 0, 0, tz);

    const rows = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: {
            $gte: yearStart,
            $lt: yearEnd,
          },
        },
      },
      {
        $group: {
          _id: {
            month: { $month: { date: '$date', timezone: tz } },
            year: { $year: { date: '$date', timezone: tz } },
            type: '$type',
            category: '$category',
          },
          total: { $sum: '$amount' },
        },
      },
    ]);

    const months = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const monthRows = rows.filter(
        (r) => r._id.month === month && (r._id.year == null || r._id.year === year)
      );
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
