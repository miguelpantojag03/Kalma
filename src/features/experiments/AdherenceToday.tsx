import { View } from 'react-native';
import { Chip, KText } from '@/components/ui';
import { dayKey } from '@/lib/dates';
import { haptic } from '@/lib/haptics';
import type { Experiment } from '@/lib/schema';
import { useKalma } from '@/lib/store';
import { space } from '@/theme';

/** "¿Lo cumpliste hoy?" con dos chips: un toque, sin culpa si la respuesta es no. */
export function AdherenceToday({ experiment }: { experiment: Experiment }) {
  const logAdherence = useKalma((s) => s.logAdherence);
  const today = dayKey(new Date());
  const value = experiment.adherence[today];
  return (
    <View style={{ gap: space[2] }}>
      <KText variant="bodyStrong">¿Lo cumpliste hoy?</KText>
      <View accessibilityRole="radiogroup" accessibilityLabel="¿Lo cumpliste hoy?" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
        <Chip label="Sí, lo cumplí" selected={value === true} onPress={() => { haptic.success(); logAdherence(experiment.id, today, true); }} />
        <Chip label="Hoy no" selected={value === false} onPress={() => logAdherence(experiment.id, today, false)} />
      </View>
      {value === false && <KText variant="small" tone="muted">No pasa nada: anotarlo también sirve para comparar bien.</KText>}
    </View>
  );
}
