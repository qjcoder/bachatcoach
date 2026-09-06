import { type ReactNode } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { ModalBackdrop } from '@/components/ModalBackdrop';
import { AppPortal } from '@/context/BlurOverlayContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Radius } from '@/constants/theme';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Wrap body in ScrollView (default). Set false when children include FlatList/ScrollView. */
  scrollable?: boolean;
  /** Optional title / handle accent */
  accentColor?: string;
};

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
  scrollable = true,
  accentColor,
}: BottomSheetProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const insets = useSafeAreaInsets();

  const body = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.sheetContent}
      bounces={false}
      nestedScrollEnabled>
      {children}
    </ScrollView>
  ) : (
    children
  );

  return (
    <AppPortal visible={visible}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 16}>
        <ModalBackdrop onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 12 }]}>
          <View style={[styles.handle, { backgroundColor: accentColor ?? colors.border }]} />
          <View style={styles.titleRow}>
            <AppText variant="h2" color={accentColor ?? colors.text} style={styles.title}>
              {title}
            </AppText>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.muted ?? '#94A3B8'} />
            </Pressable>
          </View>
          {body}
        </View>
      </KeyboardAvoidingView>
    </AppPortal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: 10,
    maxHeight: '88%',
    zIndex: 2,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: { flex: 1, paddingEnd: 12 },
  closeBtn: { padding: 4 },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
});
