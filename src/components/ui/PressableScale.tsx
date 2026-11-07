import { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { pressScale, spring } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  /** "control" (botones, chips) se encoge más que "card" (tarjetas, filas). */
  weight?: keyof typeof pressScale;
  ref?: React.Ref<React.ComponentRef<typeof Pressable>>;
}

/**
 * Pressable con respuesta física (D84): se encoge con un resorte en cuanto el dedo toca,
 * no al soltar, y vuelve desde donde esté (si sueltas a medio camino no salta).
 * Con "reducir movimiento" no cambia de tamaño: queda solo el cambio de color de cada componente.
 */
export function PressableScale({ style, weight = 'control', onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const reduce = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  const resolved = typeof style === 'function' ? style({ pressed }) : style;

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        setPressed(true);
        if (!reduce && !disabled) s.set(withSpring(pressScale[weight], spring.press));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        s.set(withSpring(1, spring.release));
        onPressOut?.(e);
      }}
      style={[resolved, animated]}
      {...rest}
    />
  );
}
