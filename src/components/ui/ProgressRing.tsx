import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';
import { KText } from './KText';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  /** Texto accesible completo: "6 de 14 días registrados para tu primer análisis". */
  label: string;
  children?: ReactNode;
}

/** Efecto de gradiente de objetivo: ver cuánto falta motiva a completar. */
export function ProgressRing({ value, max, size = 96, stroke = 10, label, children }: ProgressRingProps) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const progress = useSharedValue(reduce ? pct : 0);

  useEffect(() => {
    progress.value = reduce ? pct : withTiming(pct, { duration: 900, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [pct, reduce, progress]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - progress.value) }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.accent} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.primaryStrong}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={animatedProps}
          fill="none"
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} importantForAccessibility="no-hide-descendants">
        {children ?? (
          <KText maxFontSizeMultiplier={1.3} style={styles.num}>
            {value}
            <KText tone="muted" style={styles.max}>/{max}</KText>
          </KText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, lineHeight: 26 },
  max: { fontFamily: 'Nunito_700Bold', fontSize: 14 },
});
