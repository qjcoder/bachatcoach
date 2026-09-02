import { Children, isValidElement, cloneElement, type ReactNode } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useIsRTL } from '@/hooks/useIsRTL';

type RTLRowProps = ViewProps & {
  children: ReactNode;
  gap?: number;
  /** When true, reverses child order. Default false — parent `direction: rtl` already mirrors rows. */
  mirror?: boolean;
};

/** Horizontal row that respects Urdu RTL via native layout direction. */
export function RTLRow({ children, style, gap, mirror = false, ...props }: RTLRowProps) {
  const isRTL = useIsRTL();
  const items = Children.toArray(children);
  const shouldMirror = isRTL && mirror;
  const ordered = shouldMirror ? [...items].reverse() : items;
  const direction = isRTL ? 'rtl' : 'ltr';

  return (
    <View
      style={[{ flexDirection: 'row', alignItems: 'center', direction }, gap ? { gap } : null, style]}
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
  return (
    <View style={[{ width: '100%', alignItems: 'flex-start' }, style]} {...props}>
      {children}
    </View>
  );
}

export function rtlTextStyle(): ViewStyle {
  return { width: '100%', alignItems: 'flex-start' };
}
