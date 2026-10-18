import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from 'react-native';
import { haptic } from '@/lib/haptics';
import { elevation, radius, space, touch, typeScale, useTheme } from '@/theme';
import { KText } from './KText';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Muestra un indicador, bloquea el botón y lo anuncia como "ocupado". */
  loading?: boolean;
  loadingLabel?: string;
  /** Ícono a la izquierda. Recibe el color correcto según la variante. */
  icon?: (color: string) => ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel,
  icon,
  fullWidth,
  disabled,
  onPress,
  style,
  accessibilityHint,
  ...rest
}: ButtonProps) {
  const { c, scheme } = useTheme();
  const isDisabled = disabled || loading;

  // primary => primaryStrong + onPrimary (5.16:1 claro / 10.31:1 oscuro). primary normal no pasa AA con texto.
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.primaryStrong, fg: c.onPrimary },
    secondary: { bg: c.surface, fg: c.text, border: c.primaryStrong },
    ghost: { bg: 'transparent', fg: c.text },
    danger: { bg: c.danger, fg: c.onDanger },
  };
  const p = palette[variant];
  const shown = loading && loadingLabel ? loadingLabel : label;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={(e) => {
        haptic.tap();
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: size === 'lg' ? 56 : touch.min,
          paddingHorizontal: size === 'lg' ? space[5] : space[5],
          backgroundColor: pressed && variant !== 'primary' && variant !== 'danger' ? c.accent : p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 2 : 0,
          opacity: isDisabled ? 0.5 : pressed && (variant === 'primary' || variant === 'danger') ? 0.85 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        (variant === 'primary' || variant === 'danger') && !isDisabled && elevation(1, scheme),
        fullWidth && styles.full,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        icon && (
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {icon(p.fg)}
          </View>
        )
      )}
      <KText
        style={[size === 'lg' ? styles.labelLg : typeScale.label, { color: p.fg }]}
        numberOfLines={2}
      >
        {shown}
      </KText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    paddingVertical: space[2],
  },
  full: { alignSelf: 'stretch' },
  labelLg: { ...typeScale.subheading },
});
