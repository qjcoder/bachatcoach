import { Brand } from './theme';

const tintColorLight = Brand.primary;
const tintColorDark = Brand.primary;

export default {
  light: {
    text: Brand.text,
    background: Brand.background,
    card: Brand.card,
    tint: tintColorLight,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorLight,
    border: Brand.border,
    muted: Brand.textMuted,
  },
  dark: {
    text: '#F8FAFC',
    background: '#0F172A',
    card: '#1E293B',
    tint: tintColorDark,
    tabIconDefault: '#64748B',
    tabIconSelected: tintColorDark,
    border: '#334155',
    muted: '#94A3B8',
  },
};
