import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Brand } from '@/constants/theme';

type UserAvatarProps = {
  name?: string;
  avatar?: string;
  size?: number;
  editable?: boolean;
  onPress?: () => void;
  circular?: boolean;
};

export function UserAvatar({ name, avatar, size = 56, editable, onPress, circular }: UserAvatarProps) {
  const radius = circular ? size / 2 : size * 0.36;
  const initial = name?.charAt(0).toUpperCase() || '?';
  const fontSize = size * 0.38;

  const content = avatar ? (
    <Image source={{ uri: avatar }} style={{ width: size, height: size, borderRadius: radius }} />
  ) : (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]}>
      <AppText variant="h2" color={Brand.primary} style={{ fontSize, lineHeight: fontSize * 1.1 }}>
        {initial}
      </AppText>
    </View>
  );

  if (!onPress) {
    return <View>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      {content}
      {editable ? (
        <View style={[styles.badge, { width: size * 0.34, height: size * 0.34, borderRadius: size * 0.17 }]}>
          <Ionicons name="camera" size={size * 0.18} color="#FFFFFF" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  fallback: {
    backgroundColor: `${Brand.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${Brand.primary}30`,
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
