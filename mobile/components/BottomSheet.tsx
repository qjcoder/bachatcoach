import { type ReactNode } from 'react';
import { View, Modal, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/theme';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <AppText variant="h2" color={colors.text} style={styles.title}>{title}</AppText>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.muted ?? '#94A3B8'} />
            </Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.45)' },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { marginBottom: 0 },
  closeBtn: { padding: 4 },
});
