import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { haptic } from '@/lib/haptics';
import { clampIntensity, intensityA11y, intensityColor, intensityWord } from '@/lib/intensity';
import { elevation, radius, space, touch, typeScale, useTheme } from '@/theme';
import { KText } from './KText';

/* ---------- Badge: color + número (+ palabra) ---------- */

export interface IntensityBadgeProps {
  value: number;
  showWord?: boolean;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function IntensityBadge({ value, showWord, size = 'md', style }: IntensityBadgeProps) {
  const { c } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Intensidad ${intensityA11y(value)}`}
      style={[
        styles.badge,
        {
          backgroundColor: intensityColor(c, value),
          minWidth: size === 'sm' ? 28 : 36,
          height: size === 'sm' ? 28 : 36,
          paddingHorizontal: size === 'sm' ? space[2] : space[3],
        },
        style,
      ]}
    >
      <KText tone="onIntensity" style={size === 'sm' ? typeScale.smallStrong : styles.badgeNum}>
        {value}
      </KText>
      {showWord && (
        <KText tone="onIntensity" variant="small">
          · {intensityWord(value)}
        </KText>
      )}
    </View>
  );
}

/* ---------- Slider 0–10 ---------- */

export interface IntensitySliderProps {
  value: number;
  onChange: (v: number) => void;
  label?: string;
  /** La IA lo dedujo ("fuerte" → 7): se pide confirmar. */
  inferred?: boolean;
  disabled?: boolean;
}

/**
 * Accesible por tres vías:
 *  1. Arrastrar o tocar la pista (11 segmentos, uno por valor).
 *  2. Botones − / + de 48 pt (motricidad fina reducida).
 *  3. Lector de pantalla: rol "adjustable" (deslizar arriba/abajo en VoiceOver y TalkBack),
 *     anunciando "7 de 10, fuerte".
 */
export function IntensitySlider({ value, onChange, label = '¿Qué tan fuerte?', inferred, disabled }: IntensitySliderProps) {
  const { c, scheme } = useTheme();
  const track = useRef<View>(null);
  const geom = useRef({ x: 0, w: 1 });
  const [dragging, setDragging] = useState(false);

  const set = (v: number) => {
    const n = clampIntensity(v);
    if (n !== value) {
      haptic.tap();
      onChange(n);
    }
  };

  const fromTouch = (e: GestureResponderEvent) => {
    const { x, w } = geom.current;
    set(((e.nativeEvent.pageX - x) / w) * 10);
  };

  const measure = () => track.current?.measureInWindow((x, _y, w) => (geom.current = { x, w: Math.max(1, w) }));

  const pct = value / 10;

  return (
    <View style={{ gap: space[3], opacity: disabled ? 0.5 : 1 }}>
      <View style={styles.header}>
        <KText variant="subheading" style={{ flex: 1 }}>
          {label}
        </KText>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.readout, { backgroundColor: intensityColor(c, value) }]}
        >
          <KText tone="onIntensity" style={styles.readoutNum}>
            {value}
          </KText>
          <KText tone="onIntensity" variant="small" style={{ fontFamily: 'Inter_500Medium' }}>
            {intensityWord(value)}
          </KText>
        </View>
      </View>

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: 10, now: value, text: intensityA11y(value) }}
        accessibilityState={{ disabled: !!disabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => set(value + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
        style={styles.row}
      >
        <StepButton icon="minus" disabled={disabled || value <= 0} onPress={() => set(value - 1)} />

        <View
          ref={track}
          onLayout={measure}
          style={styles.trackHit}
          onStartShouldSetResponder={() => !disabled}
          onMoveShouldSetResponder={() => !disabled}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            measure();
            setDragging(true);
            fromTouch(e);
          }}
          onResponderMove={fromTouch}
          onResponderRelease={() => setDragging(false)}
          onResponderTerminate={() => setDragging(false)}
        >
          <View style={[styles.track, { borderColor: c.borderStrong }]}>
            {Array.from({ length: 11 }, (_, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: intensityColor(c, i), opacity: i <= value ? 1 : 0.35 }} />
            ))}
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                left: `${pct * 100}%`,
                borderColor: c.primaryStrong,
                backgroundColor: c.surface,
                transform: [{ translateX: -16 }, { scale: dragging ? 1.15 : 1 }],
              },
              elevation(2, scheme),
            ]}
          />
        </View>

        <StepButton icon="plus" disabled={disabled || value >= 10} onPress={() => set(value + 1)} />
      </View>

      <View style={styles.legend} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <KText variant="caption" tone="muted">0 · Nada</KText>
        <KText variant="caption" tone="muted">10 · Muy fuerte</KText>
      </View>

      {inferred && (
        <View style={styles.inferred}>
          <View style={[styles.dot, { backgroundColor: c.warning }]} />
          <KText variant="small" tone="warning" style={{ flex: 1 }}>
            Lo calculé por cómo lo dijiste. Ajústalo si no es así.
          </KText>
        </View>
      )}
    </View>
  );
}

function StepButton({ icon, onPress, disabled }: { icon: 'minus' | 'plus'; onPress: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  const Icon = icon === 'minus' ? Minus : Plus;
  return (
    <Pressable
      // El contenedor "adjustable" ya cubre estas acciones para lectores de pantalla.
      importantForAccessibility="no"
      accessibilityElementsHidden
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.step,
        { borderColor: c.borderStrong, backgroundColor: pressed ? c.surfaceMuted : c.surface, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      <Icon size={22} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.full },
  badgeNum: { ...typeScale.label, fontFamily: 'Nunito_800ExtraBold' },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: space[3] },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: space[2], borderRadius: radius.md, paddingHorizontal: space[3], paddingVertical: space[1] },
  readoutNum: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, lineHeight: 34 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  trackHit: { flex: 1, height: touch.min, justifyContent: 'center' },
  track: { height: 14, borderRadius: 7, overflow: 'hidden', flexDirection: 'row', borderWidth: 1 },
  thumb: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 4 },
  step: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: touch.min + space[2] },
  inferred: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
