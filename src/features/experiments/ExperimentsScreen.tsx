import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { FlaskConical, Plus } from 'lucide-react-native';
import { Banner, Button, Card, EmptyState, KText, ProgressRing } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { shortDate } from '@/lib/dates';
import { experimentDay, experimentEnd } from '@/lib/experiments';
import { experimentResult } from '@/lib/patterns';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';
import { AdherenceToday } from './AdherenceToday';

/** Mis experimentos: el activo arriba (con el check de hoy) y los terminados con su resultado. */
export function ExperimentsScreen() {
  const { c } = useTheme();
  const experiments = useKalma((s) => s.experiments);
  const entries = useKalma((s) => s.entries);
  const active = experiments.filter((x) => x.status === 'active');
  const done = experiments.filter((x) => x.status !== 'active').reverse();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Mis experimentos' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        <KText tone="muted">Cambia una sola cosa durante unos días y mira si tu síntoma cambia. Tú decides qué probar.</KText>
        <Banner tone="info" title="Kalma nunca te pedirá dejar un medicamento" message="Si quieres cambiar algo de tu tratamiento, háblalo primero con tu médico." />

        {active.map((x) => {
          const day = Math.min(x.durationDays, Math.max(1, experimentDay(x)));
          return (
            <Card key={x.id} style={{ gap: space[4] }}>
              <Pressable accessibilityRole="button" accessibilityHint="Abre el detalle del experimento" onPress={() => router.push({ pathname: '/experimento/[id]', params: { id: x.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
                <ProgressRing value={day} max={x.durationDays} size={84} label={`Día ${day} de ${x.durationDays}`}>
                  <KText variant="smallStrong" center>Día {day}{'\n'}<KText variant="caption" tone="muted">de {x.durationDays}</KText></KText>
                </ProgressRing>
                <View style={{ flex: 1, gap: space[1] }}>
                  <KText variant="caption" tone="brand">EN CURSO</KText>
                  <KText variant="subheading">{x.title}</KText>
                  <KText variant="small" tone="muted">Hasta el {shortDate(experimentEnd(x))} · observando {x.outcome}</KText>
                </View>
              </Pressable>
              <AdherenceToday experiment={x} />
            </Card>
          );
        })}

        {active.length === 0 && (
          <EmptyState
            kind="first-use"
            visual={<View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}><FlaskConical size={40} color={c.text} /></View>}
            title={done.length ? 'No tienes un experimento en curso' : 'Aún no has hecho experimentos'}
            description="Por ejemplo: dormir al menos 7 horas durante 14 días y ver si tienes menos dolores de cabeza."
          />
        )}

        <Button fullWidth size="lg" label="Nuevo experimento" icon={(col) => <Plus size={22} color={col} />} onPress={() => router.push('/experimentos/nuevo')} />

        {done.length > 0 && (
          <View style={{ gap: space[3] }}>
            <KText variant="heading">Terminados</KText>
            {done.map((x) => {
              const r = experimentResult(entries, x.startDate, x.durationDays, x.adherence, x.outcome ?? 'dolor de cabeza');
              return (
                <Pressable key={x.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/experimento/[id]', params: { id: x.id } })}>
                  <Card tone="outline" style={{ gap: space[1] }}>
                    <KText variant="caption" tone="muted">{x.status === 'cancelled' ? 'CANCELADO' : 'TERMINADO'} · {shortDate(x.startDate)}</KText>
                    <KText variant="subheading">{x.title}</KText>
                    <KText variant="small" tone="muted">
                      {r.enoughData
                        ? `${x.outcome}: ${Math.round(r.before.rate * 100)} % de los días antes · ${Math.round(r.during.rate * 100)} % durante`
                        : 'Sin datos suficientes para comparar.'}
                    </KText>
                  </Card>
                </Pressable>
              );
            })}
          </View>
        )}
      </Screen>
    </>
  );
}
