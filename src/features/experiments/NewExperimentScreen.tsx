import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { addDays } from 'date-fns';
import { Banner, Button, Card, Chip, ChipGroup, KText, TextField, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { dayKey, shortDate } from '@/lib/dates';
import { TEMPLATES, templateFor, touchesMedication } from '@/lib/experiments';
import { haptic } from '@/lib/haptics';
import { scheduleExperimentReminder } from '@/lib/notifications';
import { symptomNames } from '@/lib/selectors';
import { useKalma } from '@/lib/store';
import { usePatterns } from '@/lib/usePatterns';
import { space } from '@/theme';

const DURATIONS = [7, 14, 21] as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Crear un experimento: qué cambiar (plantillas de hábitos o texto propio), cuánto tiempo y qué
 * síntoma observar. Si viene desde un patrón, todo llega prellenado.
 */
export function NewExperimentScreen() {
  const { patron } = useLocalSearchParams<{ patron?: string }>();
  const { patterns } = usePatterns();
  const fromPattern = patterns.find((p) => p.id === patron);
  const { entries, experiments, profile, startExperiment } = useKalma();
  const showToast = useToast((s) => s.show);

  const suggested = templateFor(fromPattern?.factorId);
  const [choice, setChoice] = useState<string | null>(suggested?.factorId ?? null);
  const [custom, setCustom] = useState('');
  const [duration, setDuration] = useState<7 | 14 | 21>(14);
  const symptoms = useMemo(() => {
    const names = symptomNames(entries);
    return names.length ? names : ['dolor de cabeza', 'molestia digestiva'];
  }, [entries]);
  const [outcome, setOutcome] = useState(fromPattern?.outcome ?? symptoms[0]!);

  const tpl = TEMPLATES.find((t) => t.factorId === choice);
  const title = choice === 'custom' ? custom.trim() : tpl?.title ?? '';
  const blocked = touchesMedication(title);
  const hasActive = experiments.some((x) => x.status === 'active');
  const start = new Date();
  const valid = title.length >= 4 && !blocked && !hasActive;

  const create = async () => {
    if (!valid) return;
    startExperiment({ title, factor: choice === 'custom' ? 'custom' : choice!, durationDays: duration, startDate: dayKey(start), outcome });
    haptic.success();
    const created = useKalma.getState().experiments.at(-1)!;
    const reminded = await scheduleExperimentReminder(created.id, title, profile.reminderTime);
    showToast({ message: reminded ? 'Listo, empezó tu experimento. Te recordaré cada noche.' : 'Listo, empezó tu experimento' });
    router.replace({ pathname: '/experimento/[id]', params: { id: created.id } });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Nuevo experimento' }} />
      <Screen edges={[]} keyboard>
        <View style={{ height: space[3] }} />
        {fromPattern && <Banner tone="info" title="Viene de un patrón" message={fromPattern.statement} />}
        {hasActive && <Banner tone="warning" title="Ya tienes un experimento en curso" message="Termínalo o cancélalo primero: cambiar una sola cosa a la vez es lo que permite comparar." />}

        <ChipGroup label="¿Qué quieres probar?">
          {TEMPLATES.map((t) => <Chip key={t.factorId} label={t.title} selected={choice === t.factorId} onPress={() => setChoice(t.factorId)} />)}
          <Chip label="Otra cosa" selected={choice === 'custom'} onPress={() => setChoice('custom')} />
        </ChipGroup>
        {tpl && <KText variant="small" tone="muted">Cómo: {tpl.howTo}</KText>}
        {choice === 'custom' && (
          <TextField
            label="Escribe qué vas a cambiar"
            multiline={false}
            placeholder="Ej.: No usar pantallas después de las 10 p. m."
            value={custom}
            onChangeText={setCustom}
            error={blocked ? 'Los cambios en medicamentos o tratamientos se hablan primero con tu médico. Elige un hábito.' : undefined}
          />
        )}

        <ChipGroup label="¿Durante cuánto tiempo?">
          {DURATIONS.map((d) => <Chip key={d} label={`${d} días`} selected={duration === d} onPress={() => setDuration(d)} />)}
        </ChipGroup>

        <ChipGroup label="¿Qué síntoma vas a observar?">
          {symptoms.map((s) => <Chip key={s} label={cap(s)} selected={outcome === s} onPress={() => setOutcome(s)} />)}
        </ChipGroup>

        {title.length >= 4 && !blocked && (
          <Card tone="soft" style={{ gap: space[1] }}>
            <KText variant="bodyStrong">{title}</KText>
            <KText variant="small">Del {shortDate(start)} al {shortDate(addDays(start, duration - 1))}. Cada noche te pregunto si lo cumpliste y al final comparo tu {outcome} antes y durante.</KText>
          </Card>
        )}

        <Button fullWidth size="lg" label="Empezar experimento" disabled={!valid} onPress={create} />
        <KText variant="caption" tone="muted" center>Kalma nunca te pedirá dejar un medicamento.</KText>
      </Screen>
    </>
  );
}
