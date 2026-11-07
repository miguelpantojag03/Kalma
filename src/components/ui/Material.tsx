import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';

/** "Reducir transparencia" de iOS. En Android y web no existe: devuelve false. */
export function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((v) => alive && setReduce(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

export interface MaterialProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
}

/**
 * Material translúcido para la "capa funcional" que flota sobre el contenido (barra de pestañas,
 * barra compacta del título). El contenido pasa por debajo y se adivina, así se entiende que la
 * barra está encima y no ocupa una franja fija (D86).
 *
 * - iOS: desenfoque del sistema + un velo del color de fondo de Kalma (mantiene la marca).
 * - Android y "Reducir transparencia": superficie sólida (el desenfoque en Android necesita
 *   una vista objetivo y no es fiable en Expo Go; la legibilidad va primero).
 */
export function Material({ children, style, pointerEvents }: MaterialProps) {
  const { c, scheme } = useTheme();
  const reduceTransparency = useReduceTransparency();
  const translucent = Platform.OS === 'ios' && !reduceTransparency;

  if (!translucent) {
    return (
      <View pointerEvents={pointerEvents} style={[{ backgroundColor: c.surface }, style]}>
        {children}
      </View>
    );
  }
  return (
    <View pointerEvents={pointerEvents} style={[styles.clip, style]}>
      <BlurView
        intensity={80}
        tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      {/* Velo de marca: el blanco/negro del sistema se tiñe con el verde de Kalma */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, opacity: scheme === 'dark' ? 0.55 : 0.5 }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
