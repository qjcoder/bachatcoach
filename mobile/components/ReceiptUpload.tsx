import { View, Image, Pressable, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { useDialog } from '@/context/DialogContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius } from '@/constants/theme';

type ReceiptUploadProps = {
  previewUri: string | null;
  onChange: (value: { uri: string } | null) => void;
  accent?: string;
  /** Force dark surface styling (add-transaction screen) */
  dark?: boolean;
};

export async function pickReceiptImage(source: 'library' | 'camera') {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  return source === 'camera'
    ? ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      })
    : ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
      });
}

export function ReceiptUpload({
  previewUri,
  onChange,
  accent = Brand.primary,
  dark = false,
}: ReceiptUploadProps) {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const text = dark ? '#FFFFFF' : colors.text;
  const muted = dark ? 'rgba(255,255,255,0.55)' : colors.muted;
  const field = dark ? 'rgba(255,255,255,0.06)' : colors.field;
  const border = dark ? 'rgba(255,255,255,0.1)' : colors.border;

  const handlePick = async (source: 'library' | 'camera') => {
    const result = await pickReceiptImage(source);

    if (!result) {
      showAlert({
        title: t('expenses.receipt'),
        message: t('expenses.photoPermission'),
        tone: 'warning',
      });
      return;
    }

    if (result.canceled || !result.assets[0]?.uri) return;
    onChange({ uri: result.assets[0].uri });
  };

  return (
    <View style={styles.wrap}>
      {previewUri ? (
        <View style={[styles.previewCard, { borderColor: border }]}>
          <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
          <Pressable onPress={() => onChange(null)} style={styles.removeBtn}>
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.placeholder, { borderColor: `${accent}50`, backgroundColor: `${accent}0C` }]}>
          <View style={[styles.placeholderIcon, { backgroundColor: `${accent}18` }]}>
            <Ionicons name="receipt-outline" size={26} color={accent} />
          </View>
          <AppText variant="bodySmallBold" color={text} align="center">
            {t('expenses.addReceipt')}
          </AppText>
          <AppText variant="caption" color={muted} align="center" style={styles.hint}>
            {t('expenses.receiptHint')}
          </AppText>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => handlePick('camera')}
          style={[styles.actionBtn, { backgroundColor: accent, borderColor: accent }]}>
          <View style={styles.actionContent}>
            <Ionicons name="camera" size={18} color="#FFFFFF" />
            <AppText variant="captionBold" color="#FFFFFF" align="center" numberOfLines={1}>
              {t('expenses.takePhoto')}
            </AppText>
          </View>
        </Pressable>
        <Pressable
          onPress={() => handlePick('library')}
          style={[styles.actionBtn, { backgroundColor: field, borderColor: border }]}>
          <View style={styles.actionContent}>
            <Ionicons name="images" size={18} color={accent} />
            <AppText variant="captionBold" color={text} align="center" numberOfLines={1}>
              {t('expenses.choosePhoto')}
            </AppText>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  placeholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  hint: { marginTop: 4 },
  previewCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  preview: { width: '100%', height: 160 },
  removeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15,23,42,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
