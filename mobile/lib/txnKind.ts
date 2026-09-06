import { TxnKind, type MoneyKind } from '@/constants/theme';

export type { MoneyKind };

/** Normalize API / UI transaction into a money kind. */
export function resolveMoneyKind(item: {
  type?: string;
  category?: string;
}): MoneyKind {
  if (item.type === 'income') return 'income';
  if (item.type === 'savings' || item.category === 'savings') return 'savings';
  return 'expense';
}

export function moneyKindColor(kind: MoneyKind): string {
  return TxnKind[kind];
}

export function moneyKindFromType(type: 'income' | 'expense' | 'savings'): MoneyKind {
  return type;
}
