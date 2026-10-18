import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/theme';

export interface AudioWaveProps {
  /** Volumen actual 0–1. */
  level: number;
  active?: boolean;
  bars?: number;
}

/**
 * Onda reactiva al volumen: confirma que el micrófono capta. Es decorativa para lectores de
 * pantalla; el estado "Te escucho" y el cronómetro se comunican por texto.
 */
export function AudioWave({ level, active = true, bars = 24 }: AudioWaveProps) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [history, setHistory] = useState<number[]>(() => Array(bars).fill(0.08));
  const levelRef = useRef(level);
  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    if (!active || reduce) return;
    const id = setInterval(() => {
      setHistory((h) => [...h.slice(1), Math.max(0.08, Math.min(1, levelRef.current))]);
    }, 80);
    return () => clearInterval(id);
  }, [active, reduce]);

  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}
    >
      {history.map((v, i) => (
        <View
          key={i}
          style={{
            width: 4,
            borderRadius: 2,
            backgroundColor: c.primary,
            height: reduce || !active ? 16 : 8 + v * 40,
            opacity: 0.4 + (i / bars) * 0.6,
          }}
        />
      ))}
    </View>
  );
}
