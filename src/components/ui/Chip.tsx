import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { haptic } from '@/lib/haptics';
import { radius, space, touch, typeScale, useTheme } from '@/theme';
import { KText } from './KText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** single = radio (una opción), multiple = checkbox (varias). Define cómo lo anuncia el lector. */
  mode?: 'single' | 'multiple';
  icon?: (color: string) => ReactNode;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * Respuesta rápida o filtro. Seleccionado = check + fondo + borde + estado accesible (nunca solo color).
 */
export function Chip({ label, selected = false, onPress, mode = 'single', icon, disabled, compact, style }: ChipProps) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole={mode === 'single' ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      hitSlop={compact ? 4 : 0}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: compact ? 40 : touch.min,
          paddingHorizontal: compact ? space[3] : space[4],
          borderColor: selected ? c.primaryStrong : c.borderStrong,
          backgroundColor: selected ? c.primarySoft : pressed ? c.surfaceMuted : c.surface,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {selected ? (
        <Check size={16} strokeWidth={3} color={c.text} />
      ) : (
        icon && <View importantForAccessibility="no-hide-descendants">{icon(c.text)}</View>
      )}
      <KText style={[compact ? typeScale.small : typeScale.body, { fontFamily: 'Inter_500Medium' }]}>{label}</KText>
    </Pressable>
  );
}

export interface ChipGroupProps {
  label: string;
  hideLabel?: boolean;
  mode?: 'single' | 'multiple';
  children: ReactNode;
  style?: ViewStyle;
}

export function ChipGroup({ label, hideLabel, mode = 'single', children, style }: ChipGroupProps) {
  return (
    <View style={style} accessibilityRole={mode === 'single' ? 'radiogroup' : 'list'} accessibilityLabel={label}>
      {!hideLabel && (
        <KText variant="subheading" style={{ marginBottom: space[3] }}>
          {label}
        </KText>
      )}
      <View style={styles.wrap}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    borderRadius: radius.full,
    borderWidth: 2,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
