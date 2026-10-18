import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { subDays } from 'date-fns';
import { ChevronRight, CloudUpload, Droplet, Sun } from 'lucide-react-native';
import { Card, KText } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { cycleSummary } from '@/lib/cycle';
import { dayKey } from '@/lib/dates';
import { useDeviceSettings } from '@/lib/deviceSettings';
import { dailyMessage } from '@/lib/motivation';
import { analysisProgress, eventsByDay } from '@/lib/selectors';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';

/** Mensaje del día: cálido, sin culpa; si ayer hubo un síntoma fuerte, es de cuidado (D71). */
export function DailyMessageCard({ now }: { now: Date }) {
  const { c } = useTheme();
  const enabled = useDeviceSettings((s) => s.dailyMessage);
  const entries = useKalma((s) => s.entries);
  const msg = useMemo(() => {
    const y = (eventsByDay(entries).get(dayKey(subDays(now, 1))) ?? []).filter((e) => e.type === 'symptom');
    const max = y.length ? Math.max(...y.map((e) => (e.type === 'symptom' ? e.data.intensity_0_10 ?? 0 : 0))) : null;
    return dailyMessage({ yesterdayMaxIntensity: max, recordedDays: analysisProgress(entries).days }, now);
  }, [entries, now]);
  if (!enabled) return null;
  return (
    <Card tone="soft" style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
      <Sun size={22} color={c.text} />
      <View style={{ flex: 1, gap: space[1] }}>
        <KText variant="caption" tone="muted">{msg.mood === 'care' ? 'CON CALMA' : 'PARA HOY'}</KText>
        <KText>{msg.text}</KText>
      </View>
    </Card>
  );
}

/** Mi ciclo en una línea (solo si la persona lo activó). */
export function CycleTodayCard() {
  const { c } = useTheme();
  const tracks = useKalma((s) => !!s.profile.tracksCycle);
  const entries = useKalma((s) => s.entries);
  const s = useMemo(() => cycleSummary(entries), [entries]);
  if (!tracks) return null;
  const text = s.cycleDay === null
    ? 'Anota tu periodo cuando llegue'
    : s.inPeriod
      ? `Tienes el periodo · día ${s.cycleDay}`
      : s.daysUntilNext !== null && s.daysUntilNext >= 0
        ? `Día ${s.cycleDay} · próximo periodo en unos ${s.daysUntilNext} ${s.daysUntilNext === 1 ? 'día' : 'días'}`
        : `Día ${s.cycleDay} · tu periodo podría llegar en estos días`;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Mi ciclo. ${text}`} onPress={() => router.push('/ciclo' as Href)}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <Droplet size={22} color={c.text} />
        <View style={{ flex: 1 }}>
          <KText variant="caption" tone="muted">MI CICLO</KText>
          <KText variant="bodyStrong">{text}</KText>
        </View>
        <ChevronRight size={20} color={c.muted} />
      </Card>
    </Pressable>
  );
}

/** Con cuenta: cuántos cambios faltan por subir a la nube (cierra la heurística 1, D75). */
export function PendingSyncNote() {
  const { c } = useTheme();
  const { status } = useAuth();
  const pending = useKalma((s) => s.outbox.length);
  if (status !== 'signedIn' || pending === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }} accessible accessibilityLiveRegion="polite">
      <CloudUpload size={16} color={c.muted} />
      <KText variant="small" tone="muted">{pending} {pending === 1 ? 'cambio' : 'cambios'} por subir a tu cuenta · se envían solos con internet</KText>
    </View>
  );
}
