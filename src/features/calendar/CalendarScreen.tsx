import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { addMonths, addWeeks, isAfter, isSameDay, startOfMonth } from 'date-fns';
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { CalendarDay, Card, Chip, ChipGroup, EmptyState, IntensityBadge, KText } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { monthMatrix, monthTitle, weekDays, WEEKDAY_LABELS } from '@/lib/calendar';
import { dayKey, fullDate, shortDate } from '@/lib/dates';
import { intensityWord } from '@/lib/intensity';
import { dayStatus, eventsByDay, symptomNames } from '@/lib/selectors';
import { periodDays } from '@/lib/cycle';
import { useKalma } from '@/lib/store';
import { radius, space, touch, useTheme } from '@/theme';

type View_ = 'month' | 'week';
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Calendario: el mes coloreado por la intensidad máxima de síntomas (color + número, D04).
 * Deslizar a los lados cambia de mes; también hay flechas (no todos descubren el gesto, y el
 * lector de pantalla necesita botones). Filtro por síntoma y vista semanal.
 */
export function CalendarScreen() {
  const reduce = useReducedMotion();
  const entries = useKalma((s) => s.entries);
  const byDay = useMemo(() => eventsByDay(entries), [entries]);
  // Días con periodo (solo si la persona registra su ciclo)
  const tracksCycle = useKalma((s) => !!s.profile.tracksCycle);
  const periodSet = useMemo(() => new Set(tracksCycle ? periodDays(entries) : []), [entries, tracksCycle]);
  const symptoms = useMemo(() => symptomNames(entries), [entries]);

  const [mode, setMode] = useState<View_>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [filter, setFilter] = useState<string | null>(null);
  const today = new Date();

  const canGoForward = !isAfter(startOfMonth(mode === 'month' ? addMonths(anchor, 1) : addWeeks(anchor, 1)), today);
  const move = (dir: -1 | 1) => {
    if (dir === 1 && !canGoForward) return;
    setAnchor((a) => (mode === 'month' ? addMonths(a, dir) : addWeeks(a, dir)));
  };

  // Deslizar a la izquierda = siguiente; a la derecha = anterior (gesture-handler v2)
  const next = Gesture.Fling().direction(Directions.LEFT).runOnJS(true).onEnd((_e, ok) => ok && move(1));
  const prev = Gesture.Fling().direction(Directions.RIGHT).runOnJS(true).onEnd((_e, ok) => ok && move(-1));
  const swipe = Gesture.Simultaneous(next, prev);

  const weeks = useMemo(() => monthMatrix(anchor), [anchor]);
  const week = useMemo(() => weekDays(anchor), [anchor]);

  // Resumen en texto para lectores de pantalla y para quien no distingue colores (WCAG 1.1.1)
  const summary = useMemo(() => {
    const days = mode === 'month' ? weeks.flat().filter((d) => d.inMonth) : week;
    const withSymptom = days.map((d) => dayStatus(byDay, d.key, filter ?? undefined)).filter((v): v is number => typeof v === 'number');
    const max = withSymptom.length ? Math.max(...withSymptom) : null;
    const label = filter ?? 'síntomas';
    if (!withSymptom.length) return `Sin ${label} registrados en este periodo.`;
    return `${withSymptom.length} ${withSymptom.length === 1 ? 'día' : 'días'} con ${label}. El más fuerte: ${max} de 10 (${intensityWord(max!).toLowerCase()}).`;
  }, [mode, weeks, week, byDay, filter]);

  const title = mode === 'month' ? monthTitle(anchor) : `Semana del ${shortDate(week[0]!.date)}`;

  return (
    <Screen tab title="Calendario">
      <ChipGroup label="Vista" hideLabel>
        <Chip compact label="Mes" selected={mode === 'month'} onPress={() => setMode('month')} />
        <Chip compact label="Semana" selected={mode === 'week'} onPress={() => setMode('week')} />
      </ChipGroup>

      {symptoms.length > 0 && (
        <ChipGroup label="Filtrar por síntoma" hideLabel>
          <Chip compact label="Todos" selected={filter === null} onPress={() => setFilter(null)} />
          {symptoms.map((s) => (
            <Chip key={s} compact label={cap(s)} selected={filter === s} onPress={() => setFilter(s)} />
          ))}
        </ChipGroup>
      )}

      <Card padding="md" style={{ gap: space[3] }}>
        <View style={styles.header}>
          <NavButton dir="prev" onPress={() => move(-1)} label={mode === 'month' ? 'Mes anterior' : 'Semana anterior'} />
          <KText variant="subheading" center style={{ flex: 1 }} accessibilityLiveRegion="polite">{title}</KText>
          <NavButton dir="next" onPress={() => move(1)} disabled={!canGoForward} label={mode === 'month' ? 'Mes siguiente' : 'Semana siguiente'} />
        </View>

        <GestureDetector gesture={swipe}>
          <Animated.View key={`${mode}-${dayKey(anchor)}`} entering={reduce ? undefined : FadeIn.duration(200)}>
            {mode === 'month' ? (
              <View style={{ gap: space[1] }}>
                <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  {WEEKDAY_LABELS.map((d, i) => (
                    <KText key={i} variant="caption" tone="muted" center style={{ flex: 1 }}>{d.short}</KText>
                  ))}
                </View>
                {weeks.map((w, i) => (
                  <View key={i} style={styles.row}>
                    {w.map((cell) => {
                      const future = isAfter(cell.date, today) && !isSameDay(cell.date, today);
                      return (
                        <View key={cell.key} style={{ flex: 1 }}>
                          <CalendarDay
                            day={cell.date.getDate()}
                            fullDate={fullDate(cell.date)}
                            maxIntensity={future ? undefined : dayStatus(byDay, cell.key, filter ?? undefined)}
                            isToday={isSameDay(cell.date, today)}
                            outsideMonth={!cell.inMonth}
                            disabled={future}
                            period={periodSet.has(cell.key)}
                            onPress={() => router.push({ pathname: '/dia/[fecha]', params: { fecha: cell.key } })}
                          />
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            ) : (
              <WeekList days={week} byDay={byDay} filter={filter} />
            )}
          </Animated.View>
        </GestureDetector>

        <KText variant="small" tone="muted">{summary}</KText>
      </Card>

      <Legend />

      {entries.length === 0 && (
        <EmptyState kind="no-data" title="Aún no hay días registrados" description="Cuando registres, cada día se pinta según qué tan fuerte fue tu síntoma." />
      )}
    </Screen>
  );
}

function NavButton({ dir, onPress, disabled, label }: { dir: 'prev' | 'next'; onPress: () => void; disabled?: boolean; label: string }) {
  const { c } = useTheme();
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.nav, { backgroundColor: pressed ? c.surfaceMuted : 'transparent', opacity: disabled ? 0.3 : 1 }]}
    >
      <Icon size={24} color={c.text} />
    </Pressable>
  );
}

function WeekList({ days, byDay, filter }: { days: ReturnType<typeof weekDays>; byDay: ReturnType<typeof eventsByDay>; filter: string | null }) {
  const { c } = useTheme();
  const today = new Date();
  return (
    <View style={{ gap: space[2] }}>
      {days.map((d) => {
        const future = isAfter(d.date, today) && !isSameDay(d.date, today);
        const status = future ? undefined : dayStatus(byDay, d.key, filter ?? undefined);
        const events = byDay.get(d.key) ?? [];
        const symptoms = events.filter((e) => e.type === 'symptom' && (!filter || e.data.name === filter)).length;
        const desc = future ? 'Todavía no llega' : status === null ? 'Sin registro' : `${events.length} registros${symptoms ? ` · ${symptoms} ${symptoms === 1 ? 'síntoma' : 'síntomas'}` : ' · sin síntomas'}`;
        return (
          <Pressable
            key={d.key}
            disabled={future}
            accessibilityRole="button"
            accessibilityLabel={`${fullDate(d.date)}${isSameDay(d.date, today) ? ', hoy' : ''}: ${desc}${typeof status === 'number' ? `, máximo ${status} de 10` : ''}`}
            onPress={() => router.push({ pathname: '/dia/[fecha]', params: { fecha: d.key } })}
            style={({ pressed }) => [
              styles.weekRow,
              { backgroundColor: pressed ? c.surfaceMuted : c.surface, borderColor: status === null ? c.borderStrong : c.border, borderStyle: status === null ? 'dashed' : 'solid', opacity: future ? 0.4 : 1 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <KText variant="bodyStrong">{cap(fullDate(d.date))}{isSameDay(d.date, today) ? ' · hoy' : ''}</KText>
              <KText variant="small" tone="muted">{desc}</KText>
            </View>
            {typeof status === 'number' && <IntensityBadge value={status} />}
          </Pressable>
        );
      })}
    </View>
  );
}

function Legend() {
  const { c } = useTheme();
  return (
    <View style={{ gap: space[2] }} accessible accessibilityLabel="Leyenda: cada día muestra la intensidad máxima de síntomas de 0 a 10 con color y número. Un borde punteado significa que no hay registro ese día.">
      <KText variant="smallStrong" tone="muted">Cómo leer el calendario</KText>
      <View style={[styles.row, { flexWrap: 'wrap', gap: space[2], alignItems: 'center' }]}>
        {[2, 5, 8, 10].map((v) => <IntensityBadge key={v} value={v} size="sm" showWord />)}
        <View style={[styles.legendBox, { borderColor: c.borderStrong }]} />
        <KText variant="small" tone="muted">Sin registro</KText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  row: { flexDirection: 'row', gap: space[1] },
  nav: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center' },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[3], borderRadius: radius.md, borderWidth: 2, minHeight: touch.min },
  legendBox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderStyle: 'dashed' },
});
