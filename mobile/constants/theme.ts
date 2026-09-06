export const Brand = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryDeep: '#065F46',
  secondary: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
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
