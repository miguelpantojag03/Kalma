import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Mic, MicOff, Square } from 'lucide-react-native';
import { haptic } from '@/lib/haptics';
import { elevation, touch, useTheme } from '@/theme';

export type MicState = 'idle' | 'listening' | 'processing' | 'blocked' | 'unavailable';

export interface MicButtonProps {
  state?: MicState;
  /** "nav" = botón central de la barra (72). "hero" = pantalla de registro (96). */
  size?: 'nav' | 'hero';
  /** Volumen 0–1: hace crecer el halo mientras escucha. */
  level?: number;
  onPress?: () => void;
  /** Etiqueta personalizada (p. ej. "Registrar" en la barra). */
  label?: string;
}

const LABELS: Record<MicState, string> = {
  idle: 'Registrar por voz',
  listening: 'Terminar de grabar',
  processing: 'Kalma está entendiendo',
  blocked: 'Micrófono sin permiso',
  unavailable: 'Voz no disponible en este dispositivo',
};

const HINTS: Partial<Record<MicState, string>> = {
  idle: 'Toca una vez para empezar a hablar',
  listening: 'Toca para terminar',
  blocked: 'Toca para ver cómo darle permiso o escribirlo',
  unavailable: 'Toca para escribirlo o elegir un ejemplo',
};

/**
 * Un toque inicia y otro termina: no hay que mantener presionado (accesibilidad motriz, D07).
 * Háptica al empezar y al terminar para confirmar sin mirar.
 */
export function MicButton({ state = 'idle', size = 'hero', level = 0, onPress, label }: MicButtonProps) {
  const { c, scheme } = useTheme();
  const reduce = useReducedMotion();
  const dim = size === 'hero' ? touch.micHero : touch.mic;
  const iconSize = size === 'hero' ? 40 : 32;

  const breath = useSharedValue(0);
  const vol = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(breath);
    breath.value = 0;
    if (reduce || state !== 'idle') return;
    breath.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(breath);
  }, [state, reduce, breath]);

  useEffect(() => {
    vol.value = reduce ? 0 : withSpring(state === 'listening' ? Math.min(1, Math.max(0, level)) : 0, { damping: 18, stiffness: 260 });
  }, [level, state, reduce, vol]);

  const halo = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.15 + vol.value * 0.45 }],
    opacity: state === 'listening' ? 0.9 : 0.7 - breath.value * 0.35,
  }));

  const inactive = state === 'blocked' || state === 'unavailable';

  return (
    <View style={{ width: dim, height: dim, alignItems: 'center', justifyContent: 'center' }}>
      {!inactive && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { borderRadius: dim / 2, backgroundColor: c.accent }, halo]}
        />
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? LABELS[state]}
        accessibilityHint={HINTS[state]}
        accessibilityState={{ busy: state === 'processing', selected: state === 'listening' }}
        disabled={state === 'processing'}
        onPress={() => {
          if (state === 'idle') haptic.start();
          else if (state === 'listening') haptic.stop();
          onPress?.();
        }}
        style={({ pressed }) => [
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: inactive ? c.surface : c.primaryStrong,
            borderWidth: inactive ? 2 : 0,
            borderColor: c.borderStrong,
            transform: [{ scale: pressed ? 0.95 : 1 }],
            opacity: state === 'processing' ? 0.85 : 1,
          },
          elevation(2, scheme),
        ]}
      >
        {state === 'idle' && <Mic size={iconSize} color={c.onPrimary} />}
        {state === 'listening' && <Square size={iconSize * 0.7} color={c.onPrimary} fill={c.onPrimary} />}
        {state === 'processing' && <ActivityIndicator size="large" color={c.onPrimary} />}
        {inactive && <MicOff size={iconSize} color={c.muted} />}
      </Pressable>
    </View>
  );
}
