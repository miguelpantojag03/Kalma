import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import { useTheme } from '@/theme';

export type MascotMood = 'idle' | 'listening' | 'thinking' | 'happy' | 'sleepy';

export interface MascotProps {
  mood?: MascotMood;
  size?: number;
  /** Si se omite, la mascota es decorativa y los lectores de pantalla la saltan. */
  label?: string;
}

/**
 * Kalma: una piedra zen que "respira".
 * - idle: escala 1 → 1.04 en 4 s (respiración pausada).
 * - listening: respiración más amplia y rápida, señal de que está escuchando (Nielsen #1).
 * - thinking: balanceo suave mientras procesa.
 * Con "reducir movimiento" queda quieta; el estado lo comunica el texto de la pantalla.
 */
export function Mascot({ mood = 'idle', size = 120, label }: MascotProps) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    if (reduce || mood === 'happy' || mood === 'sleepy') return;
    const ms = mood === 'listening' ? 1200 : mood === 'thinking' ? 900 : 2000;
    t.value = withRepeat(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [mood, reduce, t]);

  const style = useAnimatedStyle(() => {
    if (mood === 'thinking') return { transform: [{ rotate: `${-3 + t.value * 6}deg` }] };
    const amp = mood === 'listening' ? 0.08 : 0.04;
    return { transform: [{ translateY: mood === 'listening' ? -2 * t.value : 0 }, { scale: 1 + amp * t.value }] };
  });

  const closed = mood === 'happy' || mood === 'sleepy';
  const ink = c.onIntensity;

  return (
    <Animated.View
      style={[{ width: size, height: (size * 170) / 200, transformOrigin: 'center bottom' }, style]}
      accessible={!!label}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      accessibilityElementsHidden={!label}
    >
      <Svg width="100%" height="100%" viewBox="0 0 200 170">
        <Ellipse cx={100} cy={158} rx={62} ry={8} fill={c.primary} opacity={0.18} />
        <Path d="M100 22c48 0 86 30 86 76 0 40-36 56-86 56s-86-16-86-56c0-46 38-76 86-76z" fill={c.primarySoft} />
        <Path
          d="M100 22c48 0 86 30 86 76 0 9-2 17-6 23-10-34-42-58-80-58S30 87 20 121c-4-6-6-14-6-23 0-46 38-76 86-76z"
          fill={c.primary}
          opacity={0.35}
        />
        <Ellipse cx={70} cy={52} rx={16} ry={7} fill="#FFFFFF" opacity={0.5} transform="rotate(-18 70 52)" />
        <Ellipse cx={62} cy={108} rx={10} ry={6} fill={c.intensity[4]} opacity={0.5} />
        <Ellipse cx={138} cy={108} rx={10} ry={6} fill={c.intensity[4]} opacity={0.5} />
        {closed ? (
          <G stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none">
            <Path d={mood === 'happy' ? 'M72 96q8-9 16 0' : 'M72 94q8 6 16 0'} />
            <Path d={mood === 'happy' ? 'M112 96q8-9 16 0' : 'M112 94q8 6 16 0'} />
          </G>
        ) : (
          <G fill={ink}>
            <Ellipse cx={80} cy={94} rx={6} ry={mood === 'listening' ? 8 : 7} />
            <Ellipse cx={120} cy={94} rx={6} ry={mood === 'listening' ? 8 : 7} />
          </G>
        )}
        {mood === 'listening' ? (
          <Ellipse cx={100} cy={116} rx={6} ry={5} fill={ink} opacity={0.85} />
        ) : mood === 'thinking' ? (
          <Path d="M92 116h16" stroke={ink} strokeWidth={4} strokeLinecap="round" />
        ) : (
          <Path d="M90 113q10 9 20 0" stroke={ink} strokeWidth={4} strokeLinecap="round" fill="none" />
        )}
      </Svg>
    </Animated.View>
  );
}
