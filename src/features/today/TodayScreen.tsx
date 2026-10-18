import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight, FlaskConical, Plus } from 'lucide-react-native';
import { AdherenceToday } from '@/features/experiments/AdherenceToday';
import { experimentDay } from '@/lib/experiments';
import { Banner, Button, Card, EmptyState, KText, MicButton, ProgressRing } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { dayKey } from '@/lib/dates';
import { analysisProgress, daysThisWeek, eventsByDay } from '@/lib/selectors';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';
import { DayTimeline } from './DayTimeline';
import { NewPatternCard } from './NewPatternCard';
import { QuickSymptomSheet } from './QuickSymptomSheet';

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Hoy. Jerarquía: 1) registrar (micrófono y síntoma rápido, en la zona del pulgar de la mitad
 * superior de la lista), 2) avisos del momento (check-in, patrón nuevo), 3) progreso, 4) el día.
 */
export function TodayScreen() {
  const { c } = useTheme();
  const entries = useKalma((s) => s.entries);
  const profile = useKalma((s) => s.profile);
  const active = useKalma((s) => s.experiments.find((x) => x.status === 'active'));
  const [now, setNow] = useState(() => new Date());
  const [quickOpen, setQuickOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const today = dayKey(now);
  const todayEvents = useMemo(() => eventsByDay(entries).get(today) ?? [], [entries, today]);
  const progress = useMemo(() => analysisProgress(entries), [entries]);
  const week = useMemo(() => daysThisWeek(entries, now), [entries, now]);
  const checkinDone = useMemo(() => entries.some((e) => e.source === 'checkin' && dayKey(e.recordedAt) === today), [entries, today]);
  const showCheckin = now.getHours() >= 19 && !checkinDone;

  const caregiver = profile.caregiver.enabled ? profile.caregiver.personName : null;

  // Deslizar para refrescar: recalcula "hoy" (útil si la app quedó abierta desde ayer).
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setNow(new Date());
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  return (
    <Screen
      tab
      title={profile.name ? `${greeting(now)}, ${profile.name}` : greeting(now)}
      subtitle={caregiver ? `Registrando por ${caregiver}` : 'Cuéntame cómo te fue hoy'}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primaryStrong} colors={[c.primaryStrong]} />}
    >
      {showCheckin && (
        <Banner
          tone="reminder"
          title="Hora del check-in"
          message="Unas preguntas rápidas sobre tu día, en menos de 30 segundos."
          actions={<Button label="Responder" onPress={() => router.push('/checkin')} />}
        />
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        <MicButton size="nav" label="Registrar por voz" onPress={() => router.push({ pathname: '/registro', params: { auto: '1' } })} />
        <View style={{ flex: 1, gap: space[1] }}>
          <KText variant="subheading">Cuéntale a Kalma</KText>
          <KText variant="small" tone="muted">Qué comiste, cómo dormiste o qué sentiste. Yo lo organizo.</KText>
        </View>
      </Card>

      <Button variant="secondary" fullWidth label="Me empezó un síntoma" icon={(col) => <Plus size={20} color={col} />} onPress={() => setQuickOpen(true)} />

      <NewPatternCard />

      {active && (
        <Card style={{ gap: space[3] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <FlaskConical size={20} color={c.text} />
            <KText variant="caption" tone="brand" style={{ flex: 1 }}>EXPERIMENTO · DÍA {Math.min(active.durationDays, Math.max(1, experimentDay(active, now)))} DE {active.durationDays}</KText>
          </View>
          <KText variant="subheading">{active.title}</KText>
          <AdherenceToday experiment={active} />
          {/* Mismo enlace que "Ver detalle" del patrón (consistencia, Nielsen #4) */}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(`/experimento/${active.id}` as Href)}
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: space[1], minHeight: 44 }}
          >
            <KText variant="smallStrong" tone="brand">Ver el experimento</KText>
            <ChevronRight size={20} color={c.primaryStrong} />
          </Pressable>
        </Card>
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
        {progress.ready ? (
          <ProgressRing value={week} max={7} label={`Registraste ${week} de los últimos 7 días`} />
        ) : (
          <ProgressRing value={progress.days} max={progress.needed} label={`${progress.days} de ${progress.needed} días registrados para tu primer análisis`} />
        )}
        <View style={{ flex: 1, gap: space[1] }}>
          {progress.ready ? (
            <>
              <KText variant="subheading">{week} de 7 días esta semana</KText>
              <KText variant="small" tone="muted">{week >= 5 ? 'Vas muy bien. Cada registro hace más claros tus patrones.' : 'Cada registro cuenta, sin importar cuándo.'}</KText>
            </>
          ) : (
            <>
              <KText variant="subheading">{progress.days} de {progress.needed} días</KText>
              <KText variant="small" tone="muted">Todavía no tengo suficientes datos; vas muy bien.</KText>
            </>
          )}
        </View>
      </Card>

      {todayEvents.length === 0 ? (
        <EmptyState kind="first-use" title="Tu día está en blanco" description="Toca el micrófono y cuéntame qué comiste, cómo dormiste o qué sentiste." />
      ) : (
        <View style={{ gap: space[3] }}>
          <KText variant="heading">Tu día</KText>
          <DayTimeline events={todayEvents} baseDate={now} />
        </View>
      )}

      <QuickSymptomSheet open={quickOpen} onClose={() => setQuickOpen(false)} />
    </Screen>
  );
}
