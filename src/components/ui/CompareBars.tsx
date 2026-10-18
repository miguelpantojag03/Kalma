import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { radius, space, useTheme } from '@/theme';
import { KText } from './KText';

export interface CompareBarsProps {
  /** "Con sueño < 6 h" / "Sin sueño < 6 h" */
  rows: { label: string; value: number; detail?: string; emphasis?: boolean }[];
  /** Resumen en texto para lectores de pantalla (WCAG 1.1.1). */
  summary: string;
}

/**
 * Gráfico de barras horizontales "con vs. sin" el factor. Hecho con Views (sin librería de gráficos):
 * respeta los tokens y el modo oscuro, y el valor siempre está escrito, no solo dibujado.
 */
export function CompareBars({ rows, summary }: CompareBarsProps) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={{ gap: space[3] }}>
      {rows.map((r) => (
        <Bar key={r.label} {...r} />
      ))}
    </View>
  );
}

function Bar({ label, value, detail, emphasis }: CompareBarsProps['rows'][number]) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const w = useSharedValue(reduce ? value : 0);
  useEffect(() => {
    w.value = reduce ? value : withTiming(value, { duration: 700, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [value, reduce, w]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(2, w.value * 100)}%` }));
  return (
    <View style={{ gap: space[1] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
        <KText variant="smallStrong" style={{ flex: 1 }}>{label}</KText>
        <KText variant="smallStrong">{Math.round(value * 100)} %</KText>
      </View>
      <View style={{ height: 14, borderRadius: radius.full, backgroundColor: c.surfaceMuted, overflow: 'hidden' }}>
        <Animated.View style={[{ height: '100%', borderRadius: radius.full, backgroundColor: emphasis ? c.primaryStrong : c.primarySoft }, style]} />
      </View>
      {!!detail && <KText variant="caption" tone="muted">{detail}</KText>}
    </View>
  );
}
