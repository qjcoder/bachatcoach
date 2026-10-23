export type TransactionPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

/** Local calendar month → ISO bounds (device timezone). */
export function monthBounds(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

/** Previous local calendar month relative to month/year. */
export function previousMonthBounds(month: number, year: number) {
  if (month === 1) return monthBounds(12, year - 1);
  return monthBounds(month - 1, year);
}

/** Current local month + previous month, for dashboard summary queries. */
export function currentMonthSummaryParams(now = new Date()) {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const { from, to } = monthBounds(month, year);
  const prev = previousMonthBounds(month, year);
  return {
    month,
    year,
    from,
    to,
    prevFrom: prev.from,
    prevTo: prev.to,
  };
}

export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getTransactionPeriodRange(period: TransactionPeriod, now = new Date()) {
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week': {
      const mondayOffset = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - mondayOffset);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
    case 'all':
      // Stable day bounds so GET cache keys match across screens / prefetch.
      start.setFullYear(2000, 0, 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      end.setMilliseconds(999);
      break;
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

export function periodFetchLimit(period: TransactionPeriod): number {
  if (period === 'all') return 2000;
  if (period === 'year') return 1000;
  if (period === 'month') return 500;
  return 200;
}

type MonthActivityRow = {
  month: number;
  year: number;
  income?: number;
  expenses?: number;
  toSavings?: number;
};

/** Newest calendar month (within rows) that has activity for this cashflow mode. */
export function latestMonthWithActivity(
  rows: MonthActivityRow[],
  kind: 'all' | 'expense' | 'income' | 'savings',
  now = new Date()
): { month: number; year: number } | null {
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const row = rows.find((r) => r.month === month && r.year === year);
    const value =
      kind === 'all'
        ? (row?.income ?? 0) + (row?.expenses ?? 0) + (row?.toSavings ?? 0)
        : kind === 'income'
          ? row?.income ?? 0
          : kind === 'savings'
            ? row?.toSavings ?? 0
            : row?.expenses ?? 0;
    if (value > 0) return { month, year };
  }
  return null;
}
