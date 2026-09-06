import { useEffect } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { ModalBackdrop } from '@/components/ModalBackdrop';
import { AppPortal } from '@/context/BlurOverlayContext';
import { Radius, Shadow } from '@/constants/theme';
import { DarkChrome } from '@/constants/Colors';

const MASCOT = require('@/assets/images/see-you-soon-mascot.png');
const LOGO_MARK = require('@/assets/images/logo-mark.png');

const GREEN = '#34D399';
const GREEN_DEEP = '#059669';
const CARD_BG = DarkChrome.dialog;
const CARD_BORDER = DarkChrome.dialogBorder;
const SAFE_BG = 'rgba(5, 150, 105, 0.12)';
const SAFE_BORDER = 'rgba(52, 211, 153, 0.45)';
const MUTED = 'rgba(255,255,255,0.62)';

type Props = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/** Pixel-matched sign-out confirmation from design mockup. */
export function SignOutDialog({ visible, busy, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!busy) onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, busy, onClose]);

  return (
    <AppPortal visible={visible}>
      <View
        style={[
          styles.overlay,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
        ]}
        pointerEvents="box-none">
        <ModalBackdrop onPress={() => !busy && onClose()} />

        <View style={styles.card} accessibilityRole="alert">
          <View style={styles.topRow}>
            <View style={styles.brandBlock}>
              <View style={styles.logoBadge}>
                <Image source={LOGO_MARK} style={styles.logoMark} resizeMode="contain" />
              </View>
              <View style={styles.brandText}>
                <AppText style={styles.brandName} numberOfLines={1}>
                  Bachat<AppText style={styles.brandNameAccent}>Coach</AppText>
                </AppText>
                <AppText style={styles.brandTag} numberOfLines={1}>
                  {t('settings.signOutBrandTag')}
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={() => !busy && onClose()}
              hitSlop={12}
              disabled={busy}
              accessibilityLabel="Close"
              accessibilityRole="button"
              style={styles.closeBtn}>
              <Ionicons name="close" size={16} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>

          <View style={styles.hero}>
            <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
            <View style={styles.scriptWrap} pointerEvents="none">
              <AppText style={styles.script}>{t('settings.signOutScript')}</AppText>
              <View style={styles.scriptUnderline} />
            </View>
          </View>

          <AppText style={styles.title}>
            {t('settings.signOutTitlePrefix')}
            <AppText style={styles.titleAccent}>{t('settings.signOutTitleAccent')}</AppText>
          </AppText>

          <AppText style={styles.body}>{t('settings.signOutBody')}</AppText>

          <View style={styles.safeBox}>
            <View style={styles.safeIcon}>
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
            </View>
            <View style={styles.safeCopy}>
              <AppText style={styles.safeTitle}>{t('settings.signOutSafeTitle')}</AppText>
              <AppText style={styles.safeBody}>{t('settings.signOutSafeBody')}</AppText>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.cancelBtn, pressed && styles.pressed]}>
              <AppText style={styles.cancelText}>{t('common.cancel')}</AppText>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={busy}
              style={({ pressed }) => [styles.signOutPress, pressed && styles.pressed, busy && styles.busy]}>
              <LinearGradient
                colors={[GREEN, GREEN_DEEP]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.signOutBtn}>
                <Ionicons name="log-out-outline" size={18} color="#fff" />
                <AppText style={styles.signOutText}>{t('settings.logoutConfirm')}</AppText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </AppPortal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: CARD_BG,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CARD_BORDER,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    alignItems: 'center',
    ...Shadow.elevated,
    zIndex: 2,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    minHeight: 36,
  },
  brandBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingEnd: 8,
    minWidth: 0,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoMark: {
    width: 24,
    height: 24,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 1,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  brandNameAccent: {
    color: GREEN,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  brandTag: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
    minHeight: 140,
  },
  mascot: {
    width: 168,
    height: 168,
  },
  scriptWrap: {
    position: 'absolute',
    right: 6,
    top: 22,
    alignItems: 'flex-start',
    transform: [{ rotate: '-10deg' }],
  },
  script: {
    color: GREEN,
    fontSize: 15,
    fontStyle: 'italic',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  scriptUnderline: {
    marginTop: 2,
    height: 2,
    width: 72,
    borderRadius: 2,
    backgroundColor: GREEN,
    opacity: 0.85,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  titleAccent: {
    color: GREEN,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  body: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 6,
  },
  safeBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: SAFE_BG,
    borderColor: SAFE_BORDER,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  safeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GREEN_DEEP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  safeTitle: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '700',
  },
  safeBody: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  signOutPress: {
    flex: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  signOutBtn: {
    minHeight: 52,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: { opacity: 0.88 },
  busy: { opacity: 0.65 },
});
