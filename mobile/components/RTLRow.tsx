import { Children, isValidElement, cloneElement, type ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useIsRTL } from '@/hooks/useIsRTL';

type RTLRowProps = ViewProps & {
  children: ReactNode;
  gap?: number;
  /** When true (default), reverses child order in Urdu. Set false when you order children manually. */
  mirror?: boolean;
};

/** Horizontal row that mirrors child order for Urdu (icon right, actions left, etc.). */
export function RTLRow({ children, style, gap, mirror = true, ...props }: RTLRowProps) {
  const isRTL = useIsRTL();
  const items = Children.toArray(children);
  const shouldMirror = isRTL && mirror;
  const ordered = shouldMirror ? [...items].reverse() : items;

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center' }, gap ? { gap } : null, style]}
      {...props}>
      {ordered.map((child, index) => {
        if (!isValidElement(child)) return child;
        const key = child.key ?? `rtl-row-${index}`;
        return cloneElement(child, { key });
      })}
    </View>
  );
}

/** Full-width block aligned to the reading start (right in Urdu). */
export function RTLBlock({ children, style, ...props }: ViewProps) {
  const isRTL = useIsRTL();
  return (
    <View
      style={[
        { width: '100%' },
        isRTL ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

export function rtlTextStyle(isRTL: boolean): ViewStyle {
  return isRTL
    ? { width: '100%', alignItems: 'flex-end' as const }
    : { width: '100%', alignItems: 'flex-start' as const };
}
