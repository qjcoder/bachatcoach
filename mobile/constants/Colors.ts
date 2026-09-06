import { Brand, TxnKindSoft } from './theme';

const tintColorLight = Brand.primary;
const tintColorDark = TxnKindSoft.income;

/**
 * Shared chrome — dark mode matches Settings (slate navy).
 * Avoid green-black (#0A1512 / #07110F) so tab bar, pages, and popups stay consistent.
 */
export const DarkChrome = {
  background: '#020617',
  card: '#0F172A',
  field: '#1E293B',
  fieldFocused: '#334155',
  border: '#334155',
  muted: '#CBD5E1',
  text: '#F8FAFC',
  /** Frost / dialog glass — cool slate, not green */
  frostVeil: 'rgba(2, 6, 23, 0.45)',
  frostHighlight: 'rgba(148, 163, 184, 0.07)',
  dialog: '#0F172A',
  dialogBorder: 'rgba(255, 255, 255, 0.08)',
} as const;

export default {
  light: {
    text: Brand.text,
    background: Brand.background,
    card: Brand.card,
    field: '#F8FAFC',
    fieldFocused: '#F0FDF4',
    tint: tintColorLight,
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorLight,
    tabBar: Brand.card,
    border: Brand.border,
    muted: Brand.textMuted,
    placeholder: '#94A3B8',
  },
  dark: {
    text: DarkChrome.text,
    background: DarkChrome.background,
    card: DarkChrome.card,
    field: DarkChrome.field,
    fieldFocused: DarkChrome.fieldFocused,
    tint: tintColorDark,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorDark,
    tabBar: DarkChrome.background,
    border: DarkChrome.border,
    muted: DarkChrome.muted,
    placeholder: '#94A3B8',
  },
};
