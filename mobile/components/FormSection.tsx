import { type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { useDirection } from '@/hooks/useDirection';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Spacing } from '@/constants/theme';

type FormSectionProps = {
  title: string;
  children: ReactNode;
  subtitle?: string;
};

export function FormSection({ title, children, subtitle }: FormSectionProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const { headingBlock } = useDirection();

  return (
    <Card variant="elevated" style={styles.card}>
      <AppText variant="overline" color={colors.muted} style={[styles.title, headingBlock]}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="caption" color={colors.muted} style={[styles.subtitle, headingBlock]}>
          {subtitle}
        </AppText>
      ) : null}
      <View style={styles.body}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md, padding: Spacing.md },
  title: { marginBottom: 4 },
  subtitle: { marginBottom: 12 },
  body: { marginTop: 8 },
});
