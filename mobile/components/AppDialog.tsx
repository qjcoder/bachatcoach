import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ModalBackdrop } from '@/components/ModalBackdrop';
import { useFrostedOverlay } from '@/context/BlurOverlayContext';
import { Brand, Radius, Shadow, TxnKindSoft } from '@/constants/theme';
import { useColors } from '@/components/useColorScheme';

export type AppDialogTone = 'success' | 'error' | 'info' | 'warning';

type AppDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: AppDialogTone;
  destructive?: boolean;
  /** Make Cancel the solid primary action (safer path emphasized). */
  safePrimary?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
};

const TONE_ICON: Record<AppDialogTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark',
  error: 'alert-circle-outline',
  info: 'information-circle-outline',
  warning: 'warning-outline',
};

const TONE_COLOR: Record<AppDialogTone, string> = {
  success: Brand.primary,
  error: Brand.danger,
  info: Brand.primaryDark,
  warning: Brand.secondary,
};

/** Branded center dialog — root overlay with blurred backdrop. */
export function AppDialog({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  tone = 'info',
  destructive = false,
  safePrimary = false,
  onConfirm,
  onClose,
}: AppDialogProps) {
  const colors = useColors();
  const color = TONE_COLOR[tone];
  const hasCancel = Boolean(cancelLabel);
  const isSuccess = tone === 'success';

  useFrostedOverlay(visible);

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <ModalBackdrop onPress={onClose} />

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isSuccess ? `${Brand.primary}55` : colors.border,
          },
        ]}
        accessibilityRole="alert">
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="Close"
          accessibilityRole="button"
          style={[styles.closeBtn, { backgroundColor: colors.field, borderColor: colors.border }]}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>

          <View style={styles.iconBlock}>
            {isSuccess ? (
              <>
                <View style={styles.sparkTop}>
                  <View style={[styles.spark, styles.sparkA]} />
                  <View style={[styles.spark, styles.sparkB]} />
                  <View style={[styles.spark, styles.sparkC]} />
                </View>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark" size={32} color="#fff" />
                </View>
                <View style={styles.sparkBottom}>
                  <View style={[styles.spark, styles.sparkD]} />
                  <View style={[styles.spark, styles.sparkE]} />
                </View>
              </>
            ) : (
              <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
                <Ionicons name={TONE_ICON[tone]} size={28} color={color} />
              </View>
            )}
          </View>

          <AppText variant="h2" color={colors.text} style={styles.title}>
            {title}
          </AppText>
          {message ? (
            <AppText variant="bodySmall" color={colors.muted} style={styles.message}>
              {message}
            </AppText>
          ) : (
            <View style={styles.messageSpacer} />
          )}

          {hasCancel ? (
            <View style={styles.actionsRow}>
              {safePrimary ? (
                <>
                  <Button
                    title={confirmLabel}
                    onPress={handleConfirm}
                    variant="outline"
                    compact
                    style={{
                      ...styles.actionHalf,
                      ...(destructive ? { borderColor: Brand.danger } : null),
                    }}
                  />
                  <Button
                    title={cancelLabel!}
                    onPress={onClose}
                    compact
                    style={styles.actionHalf}
                  />
                </>
              ) : (
                <>
                  <Button
                    title={cancelLabel!}
                    onPress={onClose}
                    variant="outline"
                    compact
                    style={styles.actionHalf}
                  />
                  <Button
                    title={confirmLabel}
                    onPress={handleConfirm}
                    compact
                    style={destructive ? styles.actionHalfDestructive : styles.actionHalf}
                  />
                </>
              )}
            </View>
          ) : isSuccess ? (
            <Pressable onPress={handleConfirm} style={({ pressed }) => [styles.donePress, pressed && styles.pressed]}>
              <LinearGradient
                colors={[TxnKindSoft.income, Brand.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.doneBtn}>
                <AppText variant="button" color="#fff">
                  {confirmLabel}
                </AppText>
              </LinearGradient>
            </Pressable>
          ) : (
            <Button
              title={confirmLabel}
              onPress={handleConfirm}
              compact
              style={destructive ? styles.buttonDestructive : styles.button}
            />
          )}
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    zIndex: 10000,
    elevation: 10000,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    ...Shadow.elevated,
    borderWidth: 1,
    zIndex: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    end: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  iconBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    minHeight: 72,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Brand.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sparkTop: {
    position: 'absolute',
    top: 0,
    width: 90,
    height: 24,
  },
  sparkBottom: {
    position: 'absolute',
    bottom: 0,
    width: 90,
    height: 20,
  },
  spark: {
    position: 'absolute',
    backgroundColor: Brand.primary,
    borderRadius: 2,
    opacity: 0.85,
  },
  sparkA: { width: 3, height: 12, left: 12, top: 2, transform: [{ rotate: '-18deg' }] },
  sparkB: { width: 3, height: 10, right: 18, top: 0, transform: [{ rotate: '22deg' }] },
  sparkC: { width: 8, height: 3, right: 8, top: 14 },
  sparkD: { width: 3, height: 10, left: 16, bottom: 0, transform: [{ rotate: '15deg' }] },
  sparkE: { width: 7, height: 3, right: 14, bottom: 6 },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 22,
    paddingHorizontal: 20,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  messageSpacer: { height: 12 },
  button: {
    width: '100%',
    borderRadius: Radius.md,
  },
  buttonDestructive: {
    width: '100%',
    borderRadius: Radius.md,
    backgroundColor: Brand.danger,
  },
  donePress: {
    width: '100%',
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  doneBtn: {
    minHeight: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionHalf: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
  },
  actionHalfDestructive: {
    flex: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    backgroundColor: Brand.danger,
  },
  pressed: { opacity: 0.88 },
});
