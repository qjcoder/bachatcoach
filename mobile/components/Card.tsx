import { type ReactNode } from 'react';
import { View, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { RTLRow } from '@/components/RTLRow';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useDirection } from '@/hooks/useDirection';
import { Brand, Radius, Shadow, Spacing } from '@/constants/theme';

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
};

export function CardHeader({ icon, title, iconColor = Brand.primary }: CardHeaderProps) {
  const { headingBlock } = useDirection();

  return (
    <RTLRow style={styles.cardHeader} gap={12}>
      <View style={[styles.cardHeaderIcon, { backgroundColor: `${iconColor}14` }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.cardHeaderTitle}>
        <AppText variant="h3" style={headingBlock}>{title}</AppText>
      </View>
    </RTLRow>
  );
}

type StatCardProps = {
  label: string;
  value: string;
  accent?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
};

export function StatCard({ label, value, accent, iconName }: StatCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const tint = accent || Brand.primary;
  const { headingBlock, alignStart, isRTL } = useDirection();

  return (
    <Card variant="elevated" style={[styles.statCard, { alignItems: alignStart, direction: isRTL ? 'rtl' : 'ltr' }]}>
      {iconName ? (
        <View style={[styles.statIconWrap, { backgroundColor: `${tint}12` }]}>
          <Ionicons name={iconName} size={20} color={tint} />
        </View>
      ) : null}
      <View style={[styles.statTextCol, { alignItems: alignStart, alignSelf: 'stretch' }]}>
        <AppText variant="overline" color={colors.muted} numberOfLines={2} style={[styles.statLabel, headingBlock]}>
          {label}
        </AppText>
        <AppText
          variant="amountSm"
          color={accent || colors.text}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={headingBlock}>
          {value}
        </AppText>
      </View>
    </Card>
  );
}

type HeroSavingsCardProps = {
  label: string;
  amount: string;
  rate: number;
  rateLabel: string;
  delta?: { value: string; positive: boolean } | null;
};

export function HeroSavingsCard({ label, amount, rate, rateLabel, delta }: HeroSavingsCardProps) {
  const { textBlock, contentAlign } = useDirection();

  return (
    <LinearGradient
      colors={['#10B981', '#059669', '#047857']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}>
      <View style={styles.heroPattern}>
        <View style={styles.heroCircleA} />
        <View style={styles.heroCircleB} />
      </View>
      <RTLRow style={styles.heroContent} gap={16}>
        <View style={[styles.heroLeft, contentAlign]}>
          <AppText variant="label" color="rgba(255,255,255,0.9)" style={[styles.heroLabel, textBlock]}>
            {label}
          </AppText>
          <AppText variant="amount" color="#FFFFFF" numberOfLines={1} adjustsFontSizeToFit style={[styles.heroAmount, textBlock]}>
            {amount}
          </AppText>
        </View>
        <View style={styles.rateBadge}>
          <AppText variant="h2" color="#FFFFFF">{rate}%</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.88)" align="center" style={styles.rateLabel}>
            {rateLabel}
          </AppText>
        </View>
      </RTLRow>
      {delta ? (
        <RTLRow style={styles.deltaRow} gap={8}>
          <Ionicons
            name={delta.positive ? 'trending-up' : 'trending-down'}
            size={16}
            color={delta.positive ? '#A7F3D0' : '#FECACA'}
          />
          <AppText
            variant="bodySmallMedium"
            color={delta.positive ? '#A7F3D0' : '#FECACA'}
            style={styles.deltaText}>
            {delta.value}
          </AppText>
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
  statCard: { flex: 1, minWidth: '45%', padding: 14, alignSelf: 'stretch' },
  statTextCol: { width: '100%' },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: { marginBottom: 6 },
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadow.elevated,
  },
  heroPattern: { ...StyleSheet.absoluteFillObject },
  heroCircleA: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -20,
  },
  heroCircleB: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: -20,
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
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 72,
  },
  rateLabel: { marginTop: 4 },
  deltaRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
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
