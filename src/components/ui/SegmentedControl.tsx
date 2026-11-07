import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic } from '@/lib/haptics';
import { elevation, radius, space, spring, touch, typeScale, useTheme } from '@/theme';
import { KText } from './KText';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: (color: string) => ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  /** Nombre del grupo para el lector de pantalla. */
  label: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Elegir UNA opción entre 2 y 4 que cambian la vista (Mes/Semana, Claro/Oscuro) (D92).
 * Antes eran chips: se confundían con filtros y bajaban de línea. Un control segmentado es el
 * patrón conocido para esto (ley de Jakob) y ocupa una sola fila del ancho disponible.
 * El indicador se desliza con un resorte de una opción a otra (continuidad espacial).
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
  const { c, scheme } = useTheme();
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(index);

  useEffect(() => {
    x.value = reduce ? index : withSpring(index, spring.default);
  }, [index, reduce, x]);

  const segW = width > 0 ? (width - PAD * 2) / options.length : 0;
  const thumb = useAnimatedStyle(() => ({ width: segW, transform: [{ translateX: x.value * segW }] }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: c.surfaceMuted, borderColor: c.border }]}
    >
      {segW > 0 && (
        <Animated.View pointerEvents="none" style={[styles.thumb, { backgroundColor: c.surface }, elevation(1, scheme), thumb]} />
      )}
      {options.map((o) => {
        const selected = o.value === value;
        const color = selected ? c.text : c.muted;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (selected) return;
              haptic.tap();
              onChange(o.value);
            }}
            style={styles.segment}
          >
            {o.icon && <View importantForAccessibility="no-hide-descendants">{o.icon(color)}</View>}
            <KText
              numberOfLines={1}
              maxFontSizeMultiplier={1.4}
              style={[typeScale.smallStrong, { color, fontFamily: selected ? 'Inter_700Bold' : 'Inter_500Medium' }]}
            >
              {o.label}
            </KText>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 3;

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.full, padding: PAD, borderWidth: 1, minHeight: touch.min },
  thumb: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.full },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[1], paddingHorizontal: space[2] },
});
