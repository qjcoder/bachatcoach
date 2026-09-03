import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useColors } from '@/components/useColorScheme';
import { downloadDriveFileDataUri, receiptIdFromRef } from '@/lib/googleDrive';
import { ensureGoogleAccessToken } from '@/lib/googleAuth';
import { Brand, Radius } from '@/constants/theme';

type ReceiptViewerProps = {
  receiptRef: string | null;
  onClose: () => void;
};

export function ReceiptViewer({ receiptRef, onClose }: ReceiptViewerProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const visible = Boolean(receiptRef);

  useEffect(() => {
    let cancelled = false;
    if (!receiptRef) {
      setUri(null);
      setError(null);
      setLoading(false);
      return;
    }

    setUri(null);
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const fileId = receiptIdFromRef(receiptRef);
        if (!fileId) throw new Error('missing');

        const token = await ensureGoogleAccessToken();
        if (!token) {
          throw new Error('needGoogle');
        }

        const dataUri = await downloadDriveFileDataUri(fileId);
        if (!cancelled) setUri(dataUri);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        if (message.includes('needGoogle') || message.includes('not connected')) {
          setError('needGoogle');
        } else {
          setError('failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [receiptRef, reloadKey]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      onRequestClose={onClose}>
      <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Pressable onPress={onClose} style={styles.close} hitSlop={10} accessibilityRole="button">
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>

          {loading ? (
            <ActivityIndicator color={Brand.primary} size="large" />
          ) : error ? (
            <View style={styles.errorBox}>
              <Ionicons name="image-outline" size={36} color={colors.muted} />
              <AppText variant="body" color={colors.muted} align="center">
                {error === 'needGoogle' ? t('expenses.receiptNeedGoogle') : t('expenses.receiptViewFailed')}
              </AppText>
              <Button
                title={t('common.retry')}
                onPress={() => setReloadKey((n) => n + 1)}
                style={styles.retryBtn}
              />
            </View>
          ) : uri ? (
            <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          ) : null}
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
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,23,0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius.lg,
    padding: 16,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  close: { alignSelf: 'flex-end', marginBottom: 8 },
  image: { width: '100%', height: 420 },
  errorBox: { alignItems: 'center', gap: 12, paddingVertical: 24, paddingHorizontal: 8 },
  retryBtn: { marginTop: 4, minWidth: 140 },
});
