import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Brand, Radius, Shadow } from '@/constants/theme';
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
  onConfirm?: () => void;
  onClose: () => void;
};

const TONE_ICON: Record<AppDialogTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle-outline',
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

/** Branded center dialog — use instead of system Alert. */
export function AppDialog({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  tone = 'info',
  destructive = false,
  onConfirm,
  onClose,
}: AppDialogProps) {
  const colors = useColors();
  const color = TONE_COLOR[tone];
  const hasCancel = Boolean(cancelLabel);
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
      return;
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" />
        <View
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="alert">
          <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
            <Ionicons name={TONE_ICON[tone]} size={28} color={color} />
          </View>
          <AppText variant="h2" color={colors.text} style={styles.title}>
            {title}
          </AppText>
          {message ? (
            <AppText variant="body" color={colors.muted} style={styles.message}>
              {message}
            </AppText>
          ) : (
            <View style={styles.messageSpacer} />
          )}
          {hasCancel ? (
            <View style={styles.actionsRow}>
              <Button title={cancelLabel!} onPress={onClose} variant="outline" style={styles.actionHalf} />
              <Button
                title={confirmLabel}
                onPress={handleConfirm}
                style={destructive ? styles.actionHalfDestructive : styles.actionHalf}
              />
            </View>
          ) : (
            <Button
              title={confirmLabel}
              onPress={handleConfirm}
              style={destructive ? styles.buttonDestructive : styles.button}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 30, 22, 0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.xl,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    alignItems: 'center',
    ...Shadow.elevated,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 20,
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  actionHalf: {
    flex: 1,
    borderRadius: Radius.md,
  },
  actionHalfDestructive: {
    flex: 1,
    borderRadius: Radius.md,
    backgroundColor: Brand.danger,
  },
});
