import type { TFunction } from 'i18next';
import { CATEGORY_SUBTYPES } from '@/constants/theme';

const OTHER_CATEGORIES = new Set(['other', 'other_income']);

export function isOtherCategory(category?: string) {
  return !!category && OTHER_CATEGORIES.has(category);
}

export function getCategorySubtypeConfig(category?: string) {
  if (!category) return null;
  return CATEGORY_SUBTYPES[category] ?? null;
}

export function hasCategorySubtypes(category?: string) {
  return !!getCategorySubtypeConfig(category);
}

export function isKnownSubcategory(category?: string, value?: string) {
  const config = getCategorySubtypeConfig(category);
  if (!config || !value) return false;
  return config.options.includes(value);
}

/** @deprecated Prefer hasCategorySubtypes / isKnownSubcategory */
export function isBillsCategory(category?: string) {
  return category === 'bills';
}

/** @deprecated Prefer isKnownSubcategory */
export function isBillsSubcategory(value?: string) {
  return isKnownSubcategory('bills', value);
}

export function getCategoryLabel(
  category: string | undefined,
  customCategory: string | undefined,
  t: TFunction
) {
  if (!category) return '—';
  const custom = customCategory?.trim();
  if (isOtherCategory(category) && custom) {
    return custom;
  }
  const subtype = getCategorySubtypeConfig(category);
  if (subtype && custom) {
    if (subtype.options.includes(custom)) {
      return t(`${subtype.i18nKey}.${custom}`);
    }
    return custom;
  }
  return t(`categories.${category}`);
}
