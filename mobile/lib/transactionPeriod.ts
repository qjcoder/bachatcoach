export type TransactionPeriod = 'today' | 'week' | 'month' | 'year';

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
  }

  return { from: start.toISOString(), to: end.toISOString() };
}

export function periodFetchLimit(period: TransactionPeriod): number {
  if (period === 'year') return 500;
  if (period === 'month') return 200;
  return 100;
}
