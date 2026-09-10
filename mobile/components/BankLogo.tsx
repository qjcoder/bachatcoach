import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { bankInitials, bankLogoCandidates, getBankBrand } from '@/constants/bankLogos';
import { Brand } from '@/constants/theme';

type Props = {
  name: string;
  size?: number;
  /** Cash / wallet glyph instead of bank mark */
  cash?: boolean;
};

export function BankLogo({ name, size = 32, cash }: Props) {
  const brand = useMemo(() => (cash ? null : getBankBrand(name)), [cash, name]);
  /** Local only when we explicitly set it (missing/wrong remote marks). */
  const localLogo = brand?.logo;
  const candidates = useMemo(
    () => (cash || localLogo ? [] : bankLogoCandidates(name)),
    [cash, localLogo, name]
  );
  const [index, setIndex] = useState(0);
  const remoteUri = candidates[index] || null;

  useEffect(() => {
    setIndex(0);
  }, [name, cash]);

  const radius = Math.round(size * 0.28);
  const bg = brand?.color || Brand.primary;

  if (cash) {
    return (
      <View
        style={[
          styles.wrap,
          { width: size, height: size, borderRadius: radius, backgroundColor: `${Brand.primary}18` },
        ]}>
        <Ionicons name="wallet" size={Math.round(size * 0.55)} color={Brand.primary} />
      </View>
    );
  }

  if (localLogo) {
    return (
      <View style={[styles.wrap, styles.imageWrap, { width: size, height: size, borderRadius: radius }]}>
        <Image
          source={localLogo}
          style={{ width: size - 4, height: size - 4, borderRadius: Math.max(4, radius - 2) }}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (remoteUri) {
    return (
      <View style={[styles.wrap, styles.imageWrap, { width: size, height: size, borderRadius: radius }]}>
        <Image
          key={remoteUri}
          source={{ uri: remoteUri }}
          style={{ width: size - 2, height: size - 2, borderRadius: radius - 1 }}
          resizeMode="contain"
          onError={() => setIndex((i) => i + 1)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius, backgroundColor: bg }]}>
      <AppText variant="captionBold" color="#FFFFFF" style={{ fontSize: Math.round(size * 0.34) }}>
        {bankInitials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imageWrap: {
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.45)',
  },
});
