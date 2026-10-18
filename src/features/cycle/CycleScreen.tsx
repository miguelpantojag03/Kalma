import { useMemo } from 'react';
import { View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Droplet } from 'lucide-react-native';
import { Banner, Button, Card, Chip, ChipGroup, EmptyState, KText, ProgressRing, useToast } from '@/components/ui';
import { useCanRecord } from '@/components/NeedsConsent';
import { Screen } from '@/components/Screen';
import { cycleSummary, symptomsAroundPeriod } from '@/lib/cycle';
import { dayKey, shortDate } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import type { MenstrualData } from '@/lib/schema';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';
import type { z } from 'zod';

type Flow = NonNullable<z.infer<typeof MenstrualData>['flow']>;
const FLOWS: { value: Flow; label: string }[] = [
  { value: 'spotting', label: 'Manchado' },
  { value: 'light', label: 'Leve' },
  { value: 'medium', label: 'Moderado' },
  { value: 'heavy', label: 'Abundante' },
];
const SYMPTOMS = [
  { name: 'dolor de cabeza', plural: 'días con dolor de cabeza' },
  { name: 'molestia digestiva', plural: 'días con molestia digestiva' },
];

/**
 * Mi ciclo (opcional). Muestra en qué día del ciclo estás y una estimación del próximo periodo, y
 * permite anotar el flujo de hoy en un toque. Si hay datos suficientes, cuenta cuántos síntomas
 * cayeron cerca del inicio del periodo (descriptivo; se sugiere comentarlo con el médico).
 */
export function CycleScreen() {
  const { c } = useTheme();
  const entries = useKalma((s) => s.entries);
  const addEntry = useKalma((s) => s.addEntry);
  const updateEvent = useKalma((s) => s.updateEvent);
  const removeEntry = useKalma((s) => s.removeEntry);
  const showToast = useToast((s) => s.show);
  const canRecord = useCanRecord();
  const s = useMemo(() => cycleSummary(entries), [entries]);
  const today = dayKey(new Date());

  // Lo anotado hoy (para marcar el chip y no duplicar el registro)
  const todayEvent = useMemo(() => {
    for (const en of entries) for (const e of en.events) if (e.type === 'menstrual' && e.occurred_at && dayKey(e.occurred_at) === today) return e;
    return null;
  }, [entries, today]);
  const todayFlow = todayEvent?.type === 'menstrual' ? todayEvent.data.flow ?? null : null;

  const logFlow = (flow: Flow) => {
    haptic.success();
    if (todayEvent) {
      updateEvent(todayEvent.id, { data: { flow } });
      return;
    }
    const now = new Date().toISOString();
    const entry = addEntry({
      transcript: s.inPeriod ? 'Sigo con el periodo' : 'Me llegó el periodo',
      summary: 'Periodo.',
      source: 'text',
      events: [{ type: 'menstrual', occurred_at: now, occurred_at_precision: 'part_of_day', confidence: 1, source_text: 'periodo', data: { flow } }],
    });
    showToast({ message: 'Listo, lo anoté', actionLabel: 'Deshacer', onAction: () => removeEntry(entry.id) });
  };

  const relations = SYMPTOMS.map((x) => ({ ...x, ...symptomsAroundPeriod(entries, x.name) })).filter((x) => x.total >= 4);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Mi ciclo' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        {!canRecord && <Banner tone="warning" title="Registrar está en pausa" message="Activa los permisos en Perfil › Privacidad y seguridad." />}

        {s.cycleDay === null ? (
          <EmptyState
            kind="first-use"
            title="Aún no has anotado tu periodo"
            description="Cuando te llegue, márcalo aquí o díselo a Kalma: «me llegó el periodo». Con el tiempo verás tu ciclo y si tus síntomas cambian con él."
          />
        ) : (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
            <ProgressRing value={Math.min(s.cycleDay, s.cycleLength)} max={s.cycleLength} size={96} label={`Día ${s.cycleDay} de tu ciclo`}>
              <KText variant="smallStrong" center>Día {s.cycleDay}{'\n'}<KText variant="caption" tone="muted">de ~{s.cycleLength}</KText></KText>
            </ProgressRing>
            <View style={{ flex: 1, gap: space[1] }}>
              <KText variant="caption" tone="brand">{s.inPeriod ? 'TIENES EL PERIODO' : 'TU CICLO'}</KText>
              <KText variant="subheading">
                {s.inPeriod
                  ? `Día ${s.cycleDay} del periodo`
                  : s.daysUntilNext !== null && s.daysUntilNext >= 0
                    ? `Próximo periodo en unos ${s.daysUntilNext} ${s.daysUntilNext === 1 ? 'día' : 'días'}`
                    : 'Tu periodo podría llegar en estos días'}
              </KText>
              {!s.inPeriod && s.nextStart && <KText variant="small" tone="muted">Alrededor del {shortDate(s.nextStart)}</KText>}
            </View>
          </Card>
        )}

        <Card style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <Droplet size={20} color={c.text} />
            <KText variant="subheading">{todayEvent ? 'Hoy anotaste periodo' : s.inPeriod ? '¿Sigues con el periodo hoy?' : '¿Te llegó el periodo hoy?'}</KText>
          </View>
          <ChipGroup label="Flujo de hoy">
            {FLOWS.map((f) => (
              <Chip key={f.value} label={f.label} selected={todayFlow === f.value} disabled={!canRecord} onPress={() => logFlow(f.value)} />
            ))}
          </ChipGroup>
          <KText variant="small" tone="muted">Un toque lo anota con la fecha de hoy. También puedes decirlo por voz.</KText>
        </Card>

        {relations.length > 0 && s.periods.length >= 2 && (
          <Card style={{ gap: space[3] }}>
            <KText variant="subheading">Tus síntomas y tu ciclo</KText>
            {relations.map((r) => (
              <KText key={r.name}>
                {r.inWindow} de tus {r.total} {r.plural} fueron entre 2 días antes y 3 días después de que te llegó el periodo.
              </KText>
            ))}
            <Banner tone="info" title="Es una coincidencia en tus datos" message="A veces la migraña cambia con el ciclo. Si lo notas, coméntalo con tu médico." />
          </Card>
        )}

        {s.periods.length > 0 && (
          <Card style={{ gap: space[2] }}>
            <KText variant="subheading">Tus periodos</KText>
            {[...s.periods].reverse().map((p) => (
              <View key={p.start} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[1] }}>
                <KText>{shortDate(p.start)}{p.end !== p.start ? ` – ${shortDate(p.end)}` : ''}</KText>
                <KText tone="muted">{p.days} {p.days === 1 ? 'día' : 'días'}</KText>
              </View>
            ))}
            <KText variant="small" tone="muted">
              {s.estimatedLength ? 'Cuando registres dos periodos, el cálculo usará tu ciclo; por ahora uso 28 días.' : `Tu ciclo dura unos ${s.cycleLength} días y tu periodo unos ${s.periodLength}.`}
            </KText>
          </Card>
        )}

        <Banner tone="info" title="Es una estimación" message="Se calcula con el promedio de tus ciclos. No sirve como método anticonceptivo ni para buscar un embarazo." />
        <Button variant="ghost" fullWidth label="Ya no quiero registrar mi ciclo" onPress={() => router.push('/ajustes/salud')} />
      </Screen>
    </>
  );
}
