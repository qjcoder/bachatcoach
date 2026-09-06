import { useEffect } from 'react';
import {
  BackHandler,
  Image,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { ModalBackdrop } from '@/components/ModalBackdrop';
import { AppPortal } from '@/context/BlurOverlayContext';
import { Radius, Shadow } from '@/constants/theme';
import { DarkChrome } from '@/constants/Colors';

const MASCOT = require('@/assets/images/miss-you-mascot.png');

const GREEN = '#34D399';
const CARD_BG = DarkChrome.dialog;
const CARD_BORDER = DarkChrome.dialogBorder;
const WARN_BG = 'rgba(225, 29, 72, 0.12)';
const WARN_BORDER = 'rgba(251, 113, 133, 0.55)';
const WARN_TITLE = '#FB7185';
const WARN_BODY = 'rgba(251, 113, 133, 0.72)';
const DELETE_BG = '#E11D48';
const MUTED = 'rgba(255,255,255,0.55)';

type Props = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/** Pixel-matched delete-account confirmation from design mockup. */
export function DeleteAccountDialog({ visible, busy, onClose, onConfirm }: Props) {
  const { t } = useTranslation();

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
      <View style={styles.overlay} pointerEvents="box-none">
        <ModalBackdrop onPress={() => !busy && onClose()} />

        <View style={styles.card} accessibilityRole="alert">
          <Pressable
            onPress={() => !busy && onClose()}
            hitSlop={12}
            disabled={busy}
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={styles.closeBtn}>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.85)" />
          </Pressable>

          <View style={styles.hero}>
            <Image source={MASCOT} style={styles.mascot} resizeMode="contain" />
            <AppText style={styles.script}>{t('settings.deleteMissScript')}</AppText>
          </View>

          <AppText style={styles.title}>
            {t('settings.deleteMissTitlePrefix')}
            <AppText style={styles.titleAccent}>{t('settings.deleteMissTitleAccent')}</AppText>
          </AppText>

          <AppText style={styles.body}>{t('settings.deleteMissBody')}</AppText>

          <View style={styles.warnBox}>
            <View style={styles.warnIcon}>
              <Ionicons name="trash" size={16} color="#fff" />
            </View>
            <View style={styles.warnCopy}>
              <AppText style={styles.warnTitle}>{t('settings.deleteMissWarnTitle')}</AppText>
              <AppText style={styles.warnBody}>{t('settings.deleteMissWarnBody')}</AppText>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              disabled={busy}
              style={({ pressed }) => [styles.stayBtn, pressed && styles.pressed]}>
              <Ionicons name="leaf" size={18} color={GREEN} style={styles.btnIcon} />
              <View style={styles.btnCopy}>
                <AppText
                  style={styles.stayTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}>
                  {t('settings.deleteMissStayTitle')}
                </AppText>
                <AppText style={styles.staySub} numberOfLines={1}>
                  {t('settings.deleteMissStaySub')}
                </AppText>
              </View>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              disabled={busy}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed, busy && styles.busy]}>
              <Ionicons name="trash" size={18} color="#fff" style={styles.btnIcon} />
              <View style={styles.btnCopy}>
                <AppText
                  style={styles.deleteTitle}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}>
                  {t('settings.deleteMissDeleteTitle')}
                </AppText>
                <AppText style={styles.deleteSub} numberOfLines={1}>
                  {t('settings.deleteMissDeleteSub')}
                </AppText>
              </View>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
    alignItems: 'center',
    ...Shadow.elevated,
    zIndex: 2,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    end: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 6,
    minHeight: 128,
  },
  mascot: {
    width: 148,
    height: 148,
  },
  script: {
    position: 'absolute',
    right: 8,
    top: 18,
    color: GREEN,
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '600',
    letterSpacing: 0.2,
    transform: [{ rotate: '-8deg' }],
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  titleAccent: {
    color: GREEN,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  body: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  warnBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WARN_BG,
    borderColor: WARN_BORDER,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  warnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DELETE_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  warnTitle: {
    color: WARN_TITLE,
    fontSize: 14,
    fontWeight: '700',
  },
  warnBody: {
    color: WARN_BODY,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  stayBtn: {
    flex: 1,
    minHeight: 64,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: GREEN,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  deleteBtn: {
    flex: 1,
    minHeight: 64,
    borderRadius: Radius.md,
    backgroundColor: DELETE_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  btnIcon: {
    marginTop: 1,
  },
  btnCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  stayTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  staySub: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 14,
  },
  deleteTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 15,
  },
  deleteSub: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    lineHeight: 14,
  },
  pressed: { opacity: 0.88 },
  busy: { opacity: 0.65 },
});
