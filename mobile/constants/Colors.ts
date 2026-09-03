import { Brand } from './theme';

const tintColorLight = Brand.primary;
const tintColorDark = '#34D399';

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
    text: '#F8FAFC',
    background: '#020617',
    card: '#0F172A',
    field: '#1E293B',
    fieldFocused: '#134E4A',
    tint: tintColorDark,
    tabIconDefault: '#94A3B8',
    tabIconSelected: tintColorDark,
    tabBar: '#020617',
    border: '#334155',
    muted: '#CBD5E1',
    placeholder: '#94A3B8',
  },
};
