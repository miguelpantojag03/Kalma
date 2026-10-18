import { useMemo } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Button, Card, EmptyState, IntensityBadge, KText } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { dayKey, fromDayKey, fullDate } from '@/lib/dates';
import { dayStatus, eventsByDay } from '@/lib/selectors';
import { useKalma } from '@/lib/store';
import { space } from '@/theme';
import { DayTimeline } from '@/features/today/DayTimeline';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Detalle de un día: todo lo registrado, editable; y "Agregar a este día" para lo que se olvidó. */
export function DayDetailScreen() {
  const { fecha } = useLocalSearchParams<{ fecha: string }>();
  const entries = useKalma((s) => s.entries);
  const byDay = useMemo(() => eventsByDay(entries), [entries]);
  const date = fromDayKey(fecha);
  const events = byDay.get(fecha) ?? [];
  const max = dayStatus(byDay, fecha);
  const isToday = fecha === dayKey(new Date());

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: isToday ? 'Hoy' : cap(fullDate(date)) }} />
      <Screen edges={[]}>
        <View style={{ height: space[4] }} />
        {typeof max === 'number' && (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
            <IntensityBadge value={max} showWord />
            <KText style={{ flex: 1 }}>Síntoma más fuerte del día</KText>
          </Card>
        )}

        {events.length === 0 ? (
          <EmptyState kind="no-data" title="Nada registrado este día" description="Si te acuerdas, puedes agregarlo ahora. Aproximado también sirve." />
        ) : (
          <DayTimeline events={events} baseDate={date} />
        )}

        <Button
          variant="secondary"
          fullWidth
          label="Agregar a este día"
          icon={(c) => <Plus size={20} color={c} />}
          onPress={() => router.push({ pathname: '/registro', params: { fecha } })}
        />
      </Screen>
    </>
  );
}
