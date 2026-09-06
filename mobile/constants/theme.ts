/**
 * Money-flow kinds — unique, locked colors used app-wide.
 * Do not invent one-off hex for income / expense / savings UI.
 */
export const TxnKind = {
  income: '#059669',
  expense: '#E11D48',
  savings: '#C9A227',
} as const;

export const TxnKindSoft = {
  income: '#34D399',
  expense: '#FB7185',
  savings: '#D4B45A',
} as const;

export const TxnKindDeep = {
  income: '#047857',
  expense: '#BE123C',
  savings: '#A8841C',
} as const;

export type MoneyKind = keyof typeof TxnKind;

export function txnKindGradient(kind: MoneyKind): [string, string] {
  return [TxnKindSoft[kind], TxnKind[kind]];
}

export function txnKindGradientDeep(kind: MoneyKind): [string, string, string] {
  return [TxnKindSoft[kind], TxnKind[kind], TxnKindDeep[kind]];
}

/** Distinct hues for category donut slices & chips (shared app-wide). */
export const CategoryChartColors = [
  '#34D399', // mint
  '#38BDF8', // sky
  '#FBBF24', // amber
  '#FB7185', // rose
  '#A78BFA', // violet
  '#2DD4BF', // teal
  '#F97316', // orange
  '#60A5FA', // blue
] as const;

/** Stable tint per category id — same color on Home, Cashflow, Insights, Add. */
export const CategoryTints: Record<string, string> = {
  food: CategoryChartColors[3],
  transport: CategoryChartColors[7],
  bills: CategoryChartColors[2],
  rent: CategoryChartColors[6],
  shopping: CategoryChartColors[4],
  health: '#F87171',
  entertainment: '#818CF8',
  education: CategoryChartColors[0],
  subscriptions: CategoryChartColors[5],
  personal: '#94A3B8',
  other: '#94A3B8',
  salary: CategoryChartColors[0],
  freelance: CategoryChartColors[1],
  gift: '#F472B6',
  investment: CategoryChartColors[2],
  other_income: '#94A3B8',
  savings: TxnKind.savings,
};

export function categoryColorAt(index: number): string {
  return CategoryChartColors[index % CategoryChartColors.length];
}

export function categoryTint(id: string | undefined, fallbackIndex = 0): string {
  if (id && CategoryTints[id]) return CategoryTints[id];
  return categoryColorAt(fallbackIndex);
}

export const Brand = {
  /** App chrome + income */
  primary: TxnKind.income,
  primaryDark: TxnKindDeep.income,
  primaryDeep: '#065F46',
  /** Savings / goals */
  secondary: TxnKind.savings,
  secondarySoft: TxnKindSoft.savings,
  secondaryDeep: TxnKindDeep.savings,
  /** Expense + destructive */
  danger: TxnKind.expense,
  success: TxnKindSoft.income,
  background: '#F1F5F9',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  border: '#E2E8F0',
  whatsapp: '#25D366',
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const Shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 5,
  },
};

export const EXPENSE_CATEGORIES = [
  'food',
  'transport',
  'bills',
  'rent',
  'shopping',
  'health',
  'entertainment',
  'education',
  'subscriptions',
  'personal',
  'other',
] as const;

export const INCOME_CATEGORIES = ['salary', 'freelance', 'gift', 'investment', 'other_income'] as const;

export const PAYMENT_METHODS = ['cash', 'bank', 'jazzcash', 'easypaisa', 'card'] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
