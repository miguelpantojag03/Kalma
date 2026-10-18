import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { Banner, BottomSheet, Button, Card, CompareBars, EmptyState, KText, ProgressRing, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { shortDate } from '@/lib/dates';
import { adherenceDays, adherenceRate, experimentDay, experimentEnd } from '@/lib/experiments';
import { cancelExperimentReminder } from '@/lib/notifications';
import { experimentResult } from '@/lib/patterns';
import { useKalma } from '@/lib/store';
import { radius, space, useTheme } from '@/theme';
import { AdherenceToday } from './AdherenceToday';

const pct = (v: number) => `${Math.round(v * 100)} %`;

/** Detalle de un experimento: progreso, días cumplidos y resultado antes vs. durante (sin causalidad). */
export function ExperimentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { experiments, entries, endExperiment } = useKalma();
  const showToast = useToast((s) => s.show);
  const [confirm, setConfirm] = useState<'finish' | 'cancel' | null>(null);
  const x = experiments.find((e) => e.id === id);

  if (!x) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Experimento' }} />
        <EmptyState kind="no-data" title="No encontré este experimento" actions={<Button fullWidth label="Ver mis experimentos" onPress={() => router.replace('/experimentos' as Href)} />} />
      </Screen>
    );
  }

  const outcome = x.outcome ?? 'dolor de cabeza';
  const r = experimentResult(entries, x.startDate, x.durationDays, x.adherence, outcome);
  const day = Math.min(x.durationDays, Math.max(1, experimentDay(x)));
  const days = adherenceDays(x);
  const end = async (status: 'finished' | 'cancelled') => {
    endExperiment(x.id, status);
    await cancelExperimentReminder(x.id);
    setConfirm(null);
    showToast({ message: status === 'finished' ? 'Listo, terminé el experimento' : 'Cancelé el experimento', tone: 'info' });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Experimento' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
          <ProgressRing value={x.status === 'active' ? day : x.durationDays} max={x.durationDays} size={96} label={`Día ${day} de ${x.durationDays}`}>
            <KText variant="smallStrong" center>{x.status === 'active' ? `Día ${day}` : 'Fin'}{'\n'}<KText variant="caption" tone="muted">de {x.durationDays}</KText></KText>
          </ProgressRing>
          <View style={{ flex: 1, gap: space[1] }}>
            <KText variant="caption" tone="brand">{x.status === 'active' ? 'EN CURSO' : x.status === 'finished' ? 'TERMINADO' : 'CANCELADO'}</KText>
            <KText variant="heading">{x.title}</KText>
            <KText variant="small" tone="muted">{shortDate(x.startDate)} al {shortDate(experimentEnd(x))} · observando {outcome}</KText>
          </View>
        </View>

        {x.status === 'active' && <Card><AdherenceToday experiment={x} /></Card>}

        <Card style={{ gap: space[3] }}>
          <KText variant="subheading">Días cumplidos · {pct(adherenceRate(x))}</KText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }} accessible accessibilityLabel={`Cumpliste ${days.filter((d) => d.done).length} de ${days.filter((d) => d.done !== undefined).length} días anotados`}>
            {days.map((d) => (
              <View
                key={d.key}
                style={{
                  width: 36, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: d.done === true ? c.primarySoft : d.done === false ? c.surfaceMuted : 'transparent',
                  borderWidth: 2, borderColor: d.done === undefined ? c.border : 'transparent', borderStyle: d.future ? 'dashed' : 'solid',
                }}
              >
                {d.done === true ? <Check size={18} strokeWidth={3} color={c.text} /> : d.done === false ? <X size={16} color={c.muted} /> : <KText variant="caption" tone="muted">{d.index}</KText>}
              </View>
            ))}
          </View>
          <KText variant="caption" tone="muted">✓ cumplido · ✗ no cumplido · número = sin anotar</KText>
        </Card>

        <Card style={{ gap: space[3] }}>
          <KText variant="subheading">Antes vs. durante</KText>
          {r.enoughData ? (
            <>
              <CompareBars
                summary={`Días con ${outcome}: ${pct(r.before.rate)} antes del experimento y ${pct(r.during.rate)} durante.`}
                rows={[
                  { label: `Antes (${r.before.days} días)`, value: r.before.rate, detail: `${r.before.episodes} días con ${outcome}` },
                  { label: `Durante (${r.during.days} días)`, value: r.during.rate, detail: `${r.during.episodes} días con ${outcome}`, emphasis: true },
                ]}
              />
              <KText variant="small">
                {r.change < -0.05
                  ? `Durante el experimento tuviste ${outcome} en menos días que antes.`
                  : r.change > 0.05
                    ? `Durante el experimento tuviste ${outcome} en más días que antes.`
                    : `Tu ${outcome} se mantuvo parecido antes y durante.`}
              </KText>
            </>
          ) : (
            <KText variant="small" tone="muted">Necesito al menos 5 días registrados antes y 5 durante para comparar. Sigue anotando.</KText>
          )}
          <Banner tone="info" title="Es una comparación, no una prueba" message="Pudieron influir otras cosas (estrés, clima, ciclo). Coméntalo con tu médico." />
        </Card>

        {x.status === 'active' && (
          <View style={{ gap: space[2] }}>
            <Button fullWidth variant="secondary" label="Terminar ahora" onPress={() => setConfirm('finish')} />
            <Button fullWidth variant="ghost" label="Cancelar experimento" onPress={() => setConfirm('cancel')} />
          </View>
        )}

        <BottomSheet
          open={confirm !== null}
          onClose={() => setConfirm(null)}
          variant="dialog"
          title={confirm === 'finish' ? '¿Terminar el experimento?' : '¿Cancelar el experimento?'}
          description={confirm === 'finish' ? 'Se compara con los días que alcanzaste a registrar.' : 'Se guarda como cancelado y deja de recordarte.'}
          footer={
            <>
              <Button fullWidth label="Seguir con el experimento" onPress={() => setConfirm(null)} />
              <Button fullWidth variant="ghost" label={confirm === 'finish' ? 'Sí, terminar' : 'Sí, cancelar'} onPress={() => void end(confirm === 'finish' ? 'finished' : 'cancelled')} />
            </>
          }
        />
      </Screen>
    </>
  );
}
