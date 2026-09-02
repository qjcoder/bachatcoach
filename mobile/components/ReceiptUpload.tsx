import { View, Image, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Brand, Radius } from '@/constants/theme';

type ReceiptUploadProps = {
  previewUri: string | null;
  onChange: (value: { uri: string; base64: string } | null) => void;
  accent?: string;
};

async function pickFromLibrary() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  return ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.6,
    base64: true,
  });
}

async function pickFromCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  return ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.6,
    base64: true,
  });
}

export function ReceiptUpload({ previewUri, onChange, accent = Brand.primary }: ReceiptUploadProps) {
  const { t } = useTranslation();
  const colors = Colors[useColorScheme() ?? 'light'];

  const handlePick = async (source: 'library' | 'camera') => {
    const result = source === 'camera' ? await pickFromCamera() : await pickFromLibrary();

    if (!result) {
      Alert.alert(t('expenses.receipt'), t('expenses.photoPermission'));
      return;
    }

    if (result.canceled || !result.assets[0]?.uri) return;

    const asset = result.assets[0];
    onChange({
      uri: asset.uri,
      base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '',
    });
  };

  return (
    <View style={styles.wrap}>
      {previewUri ? (
        <View style={[styles.previewCard, { borderColor: colors.border }]}>
          <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
          <Pressable onPress={() => onChange(null)} style={styles.removeBtn}>
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => handlePick('library')}
          style={[styles.placeholder, { borderColor: `${accent}40`, backgroundColor: `${accent}06` }]}>
          <View style={[styles.placeholderIcon, { backgroundColor: `${accent}14` }]}>
            <Ionicons name="receipt-outline" size={28} color={accent} />
          </View>
          <AppText variant="bodySmallBold" color={colors.text} align="center">
            {t('expenses.addReceipt')}
          </AppText>
          <AppText variant="caption" color={colors.muted} align="center" style={styles.hint}>
            {t('expenses.receiptHint')}
          </AppText>
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => handlePick('camera')}
          style={[styles.actionBtn, { backgroundColor: `${accent}10`, borderColor: `${accent}30` }]}>
          <View style={styles.actionContent}>
            <Ionicons name="camera" size={20} color={accent} />
            <AppText variant="captionBold" color={accent} align="center" numberOfLines={2} style={styles.actionLabel}>
              {t('expenses.takePhoto')}
            </AppText>
          </View>
        </Pressable>
        <Pressable
          onPress={() => handlePick('library')}
          style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.actionContent}>
            <Ionicons name="images" size={20} color={accent} />
            <AppText variant="captionBold" color={colors.text} align="center" numberOfLines={2} style={styles.actionLabel}>
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
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hint: { marginTop: 4 },
  previewCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  preview: { width: '100%', height: 200 },
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
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
  },
  actionLabel: {
    width: '100%',
    paddingHorizontal: 2,
  },
});
