import { useMemo } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { ChevronRight, HeartHandshake } from 'lucide-react-native';
import { KText, PressableScale } from '@/components/ui';
import { formatTime } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import { KIND_LABEL, recentSymptom, reliefTries } from '@/lib/relief';
import { useKalma } from '@/lib/store';
import { elevation, radius, space, useTheme } from '@/theme';

/**
 * En Hoy, si hay un síntoma de las últimas 6 horas: acceso a "Mientras tanto" (D90).
 * No interrumpe el registro (que sigue siendo de 10 segundos): aparece después, donde la persona
 * vuelve al cerrar la grabación.
 */
export function ReliefTodayCard({ now }: { now: Date }) {
  const { c, scheme } = useTheme();
  const entries = useKalma((s) => s.entries);
  const ref = useMemo(() => recentSymptom(entries, now), [entries, now]);
  if (!ref) return null;

  const tried = reliefTries(ref.event);
  const pending = tried.filter((t) => t.helped === null).length;
  const sub = tried.length === 0
    // La hora ya puede terminar en punto ("p. m."): no se duplica
    ? `Anotaste ${ref.name} a las ${formatTime(ref.at.toISOString()).replace(/\.$/, '')}. Mira qué puede ayudarte mientras hablas con tu médico.`
    : pending > 0
      ? `Probaste ${tried.length === 1 ? 'una idea' : `${tried.length} ideas`}. Cuéntame si te ${tried.length === 1 ? 'ayudó' : 'ayudaron'}.`
      : 'Ya anotaste qué probaste. Va en tu reporte para el médico.';

  return (
    <PressableScale
      weight="card"
      accessibilityRole="button"
      accessibilityLabel={`Ideas para ${KIND_LABEL[ref.kind]}. ${sub}`}
      onPress={() => {
        haptic.tap();
        router.push(`/alivio/${ref.event.id}` as Href);
      }}
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: c.surface, borderWidth: 2, borderColor: c.primary },
        elevation(1, scheme),
      ]}
    >
      <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <HeartHandshake size={22} color={c.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <KText variant="caption" tone="brand" style={{ fontFamily: 'Inter_700Bold' }}>MIENTRAS TANTO</KText>
        <KText variant="subheading">Ideas para {KIND_LABEL[ref.kind]}</KText>
        <KText variant="small" tone="muted">{sub}</KText>
      </View>
      <ChevronRight size={20} color={c.muted} />
    </PressableScale>
  );
}
