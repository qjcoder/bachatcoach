import type { TFunction } from 'i18next';

const OTHER_CATEGORIES = new Set(['other', 'other_income']);

export function isOtherCategory(category?: string) {
  return !!category && OTHER_CATEGORIES.has(category);
}

export function getCategoryLabel(
  category: string | undefined,
  customCategory: string | undefined,
  t: TFunction
) {
  if (!category) return '—';
  if (isOtherCategory(category) && customCategory?.trim()) {
    return customCategory.trim();
  }
  return t(`categories.${category}`);
}
