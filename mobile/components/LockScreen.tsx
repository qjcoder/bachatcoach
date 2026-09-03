import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/AppText';
import { PinBoxes } from '@/components/PinBoxes';
import { PatternLock } from '@/components/PatternLock';
import { useDialog } from '@/context/DialogContext';
import { useLock } from '@/context/LockContext';
import {
  encodePattern,
  getLockMethod,
  getStoredPinLength,
  isBiometricEnabled,
  type LockMethod,
} from '@/lib/lock';
import { Brand } from '@/constants/theme';
import { BrandLogo } from '@/components/BrandLogo';
import { useColors } from '@/components/useColorScheme';

export default function LockScreen() {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const { unlockWithPin, unlockWithPattern, unlockWithBiometric, biometricAvailable } = useLock();
  const colors = useColors();
  const [pin, setPin] = useState('');
  const [pinLength, setPinLength] = useState(4);
  const [method, setMethod] = useState<LockMethod>('pin');
  const [useBackupPin, setUseBackupPin] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [patternStatus, setPatternStatus] = useState<'idle' | 'error'>('idle');
  const [patternKey, setPatternKey] = useState(0);

  useEffect(() => {
    (async () => {
      const nextMethod = await getLockMethod();
      setMethod(nextMethod);
      setUseBackupPin(nextMethod !== 'pattern');
      setPinLength(await getStoredPinLength());
      const bioOn = await isBiometricEnabled();
      setShowBio(bioOn && biometricAvailable);
      if (bioOn && biometricAvailable) {
        await unlockWithBiometric();
      }
    })();
  }, [biometricAvailable, unlockWithBiometric]);

  const submitPin = async (value = pin) => {
    if (value.length !== pinLength) return;
    const ok = await unlockWithPin(value);
    if (!ok) {
      showAlert({ title: t('lock.wrongPin'), tone: 'error' });
      setPin('');
    }
  };

  const submitPattern = async (nodes: number[]) => {
    const ok = await unlockWithPattern(encodePattern(nodes));
    if (!ok) {
      setPatternStatus('error');
      showAlert({ title: t('lock.wrongPattern'), tone: 'error' });
      setTimeout(() => {
        setPatternStatus('idle');
        setPatternKey((k) => k + 1);
      }, 450);
    }
  };

  const showPattern = method === 'pattern' && !useBackupPin;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.iconPlate}>
        <BrandLogo size={88} />
      </View>
      <AppText variant="h1" color={colors.text} style={styles.title}>
        {t('common.appName')}
      </AppText>
      <AppText variant="body" color={colors.muted} style={styles.subtitle}>
        {showPattern ? t('lock.enterPattern') : t('lock.enterPin')}
      </AppText>

      {showPattern ? (
        <View style={styles.patternWrap}>
          <PatternLock key={patternKey} onComplete={submitPattern} status={patternStatus} />
        </View>
      ) : (
        <>
          <View style={styles.pinWrap}>
            <PinBoxes
              value={pin}
              onChange={setPin}
              length={pinLength}
              onComplete={(value) => void submitPin(value)}
            />
          </View>
          <Pressable style={styles.btn} onPress={() => submitPin()}>
            <AppText variant="button" color="#FFFFFF">{t('lock.unlock')}</AppText>
          </Pressable>
        </>
      )}

      {method === 'pattern' ? (
        <Pressable
          style={styles.switchBtn}
          onPress={() => {
            setUseBackupPin((v) => !v);
            setPin('');
            setPatternKey((k) => k + 1);
            setPatternStatus('idle');
          }}>
          <AppText variant="bodyMedium" color={Brand.primary}>
            {useBackupPin ? t('lock.usePattern') : t('lock.useBackupPin')}
          </AppText>
        </Pressable>
      ) : null}

      {showBio && (
        <Pressable style={styles.bioBtn} onPress={unlockWithBiometric}>
          <AppText variant="bodyMedium" color={Brand.primary}>{t('lock.useBiometric')}</AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconPlate: {
    width: 96,
    height: 96,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginBottom: 4 },
  subtitle: { marginBottom: 24, marginTop: 4 },
  pinWrap: {
    width: '88%',
    maxWidth: 360,
    marginBottom: 16,
  },
  patternWrap: {
    width: '88%',
    maxWidth: 300,
    marginBottom: 8,
  },
  btn: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  switchBtn: { marginTop: 20 },
  bioBtn: { marginTop: 16 },
});
