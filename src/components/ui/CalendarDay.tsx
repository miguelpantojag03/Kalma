import { Pressable, StyleSheet, View } from 'react-native';
import { Droplet } from 'lucide-react-native';
import { intensityColor, intensityWord } from '@/lib/intensity';
import { radius, typeScale, useTheme } from '@/theme';
import { KText } from './KText';

export interface CalendarDayProps {
  day: number;
  /** Nombre completo para lectores de pantalla: "martes 14 de octubre". */
  fullDate: string;
  /** undefined = registrado sin síntomas · null = día sin registro · número = intensidad máxima. */
  maxIntensity?: number | null;
  isToday?: boolean;
  selected?: boolean;
  outsideMonth?: boolean;
  disabled?: boolean;
  /** Día con periodo (solo si la persona registra su ciclo): gota pequeña en la esquina. */
  period?: boolean;
  onPress?: () => void;
}

/**
 * Intensidad máxima = fondo de color + número. "Sin registro" = borde punteado (forma, no color,
 * y sin tono de reproche). Hoy = número dentro de un círculo.
 */
export function CalendarDay({ day, fullDate, maxIntensity, isToday, selected, outsideMonth, disabled, period, onPress }: CalendarDayProps) {
  const { c } = useTheme();
  const noRecord = maxIntensity === null;
  const has = typeof maxIntensity === 'number';
  const status = noRecord
    ? 'sin registro'
    : has
      ? `síntoma máximo ${maxIntensity} de 10, ${intensityWord(maxIntensity).toLowerCase()}`
      : 'registrado, sin síntomas';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${fullDate}${isToday ? ', hoy' : ''}: ${status}${period ? ', con periodo' : ''}`}
      accessibilityState={{ selected: !!selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        {
          backgroundColor: has ? intensityColor(c, maxIntensity) : noRecord ? 'transparent' : c.surface,
          borderColor: selected ? c.primaryStrong : noRecord ? c.borderStrong : 'transparent',
          borderStyle: noRecord && !selected ? 'dashed' : 'solid',
          borderWidth: selected ? 3 : 2,
          opacity: outsideMonth || disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <View style={[styles.num, isToday && { backgroundColor: c.primaryStrong }]}>
        <KText
          style={[typeScale.small, isToday && { fontFamily: 'Inter_700Bold' }]}
          tone={isToday ? 'onPrimary' : has ? 'onIntensity' : 'default'}
          maxFontSizeMultiplier={1.4}
        >
          {day}
        </KText>
      </View>
      {has && (
        <KText tone="onIntensity" style={styles.level} maxFontSizeMultiplier={1.4}>
          {maxIntensity}
        </KText>
      )}
      {period && (
        <View style={styles.period} importantForAccessibility="no-hide-descendants">
          <Droplet size={10} color={c.text} fill={c.text} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, aspectRatio: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', gap: 1 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  level: { fontFamily: 'Nunito_800ExtraBold', fontSize: 12, lineHeight: 14 },
  period: { position: 'absolute', top: 3, right: 3 },
});
