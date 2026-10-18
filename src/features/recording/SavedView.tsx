import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { KText, Mascot } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { space, useTheme } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Cierre de la tarea (ley Peak-end): check que se dibuja en ≤ 600 ms + háptica de éxito.
 * Con "reducir movimiento" aparece directo.
 */
export function SavedView({ count }: { count: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const draw = useSharedValue(reduce ? 1 : 0);
  const pop = useSharedValue(reduce ? 1 : 0.6);

  useEffect(() => {
    haptic.success();
    if (reduce) return;
    pop.value = withSpring(1, { damping: 12, stiffness: 180 });
    draw.value = withTiming(1, { duration: 550, easing: Easing.bezier(0.2, 0.8, 0.2, 1) });
  }, [reduce, draw, pop]);

  const LEN = 60;
  const pathProps = useAnimatedProps(() => ({ strokeDashoffset: LEN * (1 - draw.value) }));
  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[5] }} accessibilityLiveRegion="assertive">
      <Mascot mood="happy" size={120} />
      <Animated.View style={circleStyle}>
        <Svg width={88} height={88} viewBox="0 0 88 88">
          <Circle cx={44} cy={44} r={40} fill={c.primaryStrong} />
          <AnimatedPath d="M26 45 l12 12 l24 -26" stroke={c.onPrimary} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={LEN} animatedProps={pathProps} />
        </Svg>
      </Animated.View>
      <KText variant="title" center accessibilityRole="header">Listo, lo guardé</KText>
      <KText tone="muted" center>
        {count === 1 ? 'Anoté 1 cosa en tu día.' : `Anoté ${count} cosas en tu día.`}
      </KText>
    </View>
  );
}
