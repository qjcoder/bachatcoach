import { type ReactNode } from 'react';
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useDirection } from '@/hooks/useDirection';
import { Brand, Radius, Shadow, Spacing, TxnKind, TxnKindSoft } from '@/constants/theme';

type CardVariant = 'default' | 'elevated' | 'soft' | 'outline';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: CardVariant;
  accentColor?: string;
};

export function Card({ children, style, variant = 'default', accentColor }: CardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const { accentBorder } = useDirection();

  return (
    <View
      style={[
        styles.card,
        variant === 'elevated' && styles.elevated,
        variant === 'soft' && styles.soft,
        variant === 'outline' && styles.outline,
        {
          backgroundColor: colors.card,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
        },
        accentColor ? accentBorder(accentColor) : null,
        style,
      ]}>
      {children}
    </View>
  );
}

type CardHeaderProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  iconColor?: string;
  titleColor?: string;
};

export function CardHeader({ icon, title, iconColor = Brand.primary, titleColor }: CardHeaderProps) {
  const { headingBlock } = useDirection();

  return (
    <RTLRow style={styles.cardHeader} gap={12}>
      <View style={[styles.cardHeaderIcon, { backgroundColor: `${iconColor}14` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.cardHeaderTitle}>
        <AppText variant="h3" color={titleColor} style={headingBlock}>
          {title}
        </AppText>
      </View>
    </RTLRow>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  accent?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  /** Tighter padding for dense dashboards */
  compact?: boolean;
};

function gradientForAccent(accent: string, dark: boolean): [string, string, ...string[]] {
  if (accent === Brand.danger) {
    return dark ? ['#3F1D1D', '#1C1917'] : ['#FFF5F5', '#FFE4E6', '#FFFFFF'];
  }
  if (accent === Brand.secondary) {
    return dark ? ['#3D2E14', '#1C1917'] : ['#FFFBEB', '#FEF3C7', '#FFFFFF'];
  }
  return dark ? ['#064E3B', '#0F172A'] : ['#ECFDF5', '#D1FAE5', '#FFFFFF'];
}

function iconGradientForAccent(accent: string): [string, string] {
  if (accent === Brand.danger || accent === TxnKind.expense) return [TxnKindSoft.expense, TxnKind.expense];
  if (accent === Brand.secondary || accent === TxnKind.savings) return [TxnKindSoft.savings, TxnKind.savings];
  return [TxnKindSoft.income, TxnKind.income];
}

export function StatCard({ label, value, accent, iconName, compact }: StatCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const dark = scheme === 'dark';
  const colors = Colors[scheme];
  const tint = accent || Brand.primary;
  const { headingBlock, alignStart, isRTL } = useDirection();
  const wash = gradientForAccent(tint, dark);
  const iconGrad = iconGradientForAccent(tint);

  return (
    <LinearGradient
      colors={wash}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.statCard,
        compact && styles.statCardCompact,
        dark ? styles.statCardDark : styles.statCardLight,
        { alignItems: alignStart, direction: isRTL ? 'rtl' : 'ltr' },
      ]}>
      {iconName ? (
        <LinearGradient
          colors={iconGrad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statIconWrap, compact && styles.statIconWrapCompact]}>
          <Ionicons name={iconName} size={compact ? 15 : 18} color="#FFFFFF" />
        </LinearGradient>
      ) : null}
      <View style={[styles.statTextCol, { alignItems: alignStart, alignSelf: 'stretch' }]}>
        <AppText
          variant="overline"
          color={colors.muted}
          numberOfLines={2}
          style={[styles.statLabel, compact && styles.statLabelCompact, headingBlock]}>
          {label}
        </AppText>
        <AppText
          variant={compact ? 'bodySemibold' : 'amountSm'}
          color={dark ? '#FFFFFF' : tint}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={headingBlock}>
          {value}
        </AppText>
      </View>
    </LinearGradient>
  );
}

type HeroSavingsCardProps = {
  label: string;
  amount: string;
  rate: number;
  rateLabel: string;
  delta?: { value: string; positive: boolean } | null;
  compact?: boolean;
};

export function HeroSavingsCard({ label, amount, rate, rateLabel, delta, compact }: HeroSavingsCardProps) {
  const { textBlock, contentAlign } = useDirection();

  return (
    <LinearGradient
      colors={['#6EE7B7', '#10B981', '#059669', '#047857']}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroPattern} pointerEvents="none">
        <View style={styles.heroCircleA} />
        <View style={styles.heroCircleB} />
        <View style={styles.heroShine} />
      </View>
      <RTLRow style={styles.heroContent} gap={12}>
        <View style={[styles.heroLeft, contentAlign]}>
          <AppText variant="label" color="rgba(255,255,255,0.92)" style={[styles.heroLabel, textBlock]}>
            {label}
          </AppText>
          <AppText
            variant={compact ? 'amountMd' : 'amount'}
            color="#FFFFFF"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.heroAmount, textBlock]}>
            {amount}
          </AppText>
        </View>
        <View style={[styles.rateBadge, compact && styles.rateBadgeCompact]}>
          <AppText variant={compact ? 'h3' : 'h2'} color="#FFFFFF">
            {rate}%
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.9)" align="center" style={styles.rateLabel}>
            {rateLabel}
          </AppText>
        </View>
      </RTLRow>
      {delta ? (
        <RTLRow style={[styles.deltaRow, compact && styles.deltaRowCompact]} gap={8}>
          <View style={styles.deltaChip}>
            <Ionicons
              name={delta.positive ? 'trending-up' : 'trending-down'}
              size={14}
              color={delta.positive ? '#ECFDF5' : '#FEE2E2'}
            />
            <AppText
              variant="caption"
              color={delta.positive ? '#ECFDF5' : '#FEE2E2'}
              style={styles.deltaText}>
              {delta.value}
            </AppText>
          </View>
        </RTLRow>
      ) : null}
    </LinearGradient>
  );
}

type ListCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  meta?: string;
  trailing: ReactNode;
  onPress?: () => void;
  onEdit?: () => void;
  editLabel?: string;
};

export function ListCard({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  meta,
  trailing,
  onPress,
  onEdit,
  editLabel,
}: ListCardProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { textBlock, contentAlign, alignStart } = useDirection();

  const body = (
    <RTLRow style={[styles.listCard, onEdit && styles.listCardWithEdit, { backgroundColor: colors.card }]} gap={14}>
      <View style={[styles.listIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={[styles.listBody, contentAlign]}>
        <AppText variant="bodySemibold" color={colors.text} numberOfLines={2} style={textBlock}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="bodySmall" color={colors.muted} numberOfLines={2} style={[styles.listSubtitle, textBlock, styles.phoneLtr]}>
            {subtitle}
          </AppText>
        ) : null}
        {meta ? (
          <AppText variant="caption" color={colors.muted} style={[styles.listMeta, textBlock]}>
            {meta}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.listTrailing, { alignItems: alignStart }]}>{trailing}</View>
    </RTLRow>
  );

  return (
    <View>
      {onEdit ? (
        <Pressable
          onPress={onEdit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={editLabel}
          style={[styles.editBtn, { backgroundColor: colors.field, borderColor: colors.border }]}>
          <Ionicons name="pencil" size={14} color={colors.muted} />
        </Pressable>
      ) : null}
      {onPress ? (
        <Pressable onPress={onPress} accessibilityRole="button">
          {body}
        </Pressable>
      ) : (
        body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  elevated: { ...Shadow.elevated, borderWidth: 0 },
  soft: { ...Shadow.card, borderWidth: 0 },
  outline: { borderWidth: 1, ...Shadow.card },
  cardHeader: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderTitle: { flex: 1, minWidth: 0 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    alignSelf: 'stretch',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  statCardCompact: { minWidth: 0, paddingVertical: 12, paddingHorizontal: 11 },
  statCardLight: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  statCardDark: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statTextCol: { width: '100%' },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIconWrapCompact: {
    width: 30,
    height: 30,
    borderRadius: 10,
    marginBottom: 8,
  },
  statLabel: { marginBottom: 4, letterSpacing: 0.4 },
  statLabelCompact: { marginBottom: 3, fontSize: 10 },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  heroCompact: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: Radius.lg,
  },
  heroPattern: { ...StyleSheet.absoluteFillObject },
  heroCircleA: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -50,
    right: -30,
  },
  heroCircleB: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -36,
    left: -24,
  },
  heroShine: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: 20,
    left: '38%',
  },
  heroContent: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroLeft: { flex: 1, minWidth: 0 },
  heroLabel: { marginBottom: 6 },
  heroAmount: { marginTop: 2 },
  rateBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    minWidth: 72,
  },
  rateBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 64,
  },
  rateLabel: { marginTop: 4 },
  deltaRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  deltaRowCompact: { marginTop: 10 },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  deltaText: { flexShrink: 1 },
  listCard: {
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: Radius.lg,
    marginBottom: 10,
    ...Shadow.card,
  },
  listCardWithEdit: {
    paddingTop: 28,
  },
  editBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  listSubtitle: { marginTop: 3 },
  phoneLtr: { writingDirection: 'ltr', textAlign: 'left' },
  listMeta: { marginTop: 4 },
  listTrailing: { justifyContent: 'center' },
});
