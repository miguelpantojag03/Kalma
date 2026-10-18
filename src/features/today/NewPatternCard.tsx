import { View } from 'react-native';
import { router } from 'expo-router';
import { KText, PatternCard } from '@/components/ui';
import { useKalma } from '@/lib/store';
import { usePatterns } from '@/lib/usePatterns';
import { space } from '@/theme';

/** "Encontré algo que te puede interesar": el primer patrón aún no visto (y no descartado). */
export function NewPatternCard() {
  const a = usePatterns();
  const seen = useKalma((s) => s.seenPatterns);
  const p = a.visible.find((x) => !seen.includes(x.id));
  if (!p) return null;
  return (
    <View style={{ gap: space[2] }}>
      <KText variant="subheading">Encontré algo que te puede interesar</KText>
      <PatternCard level={p.level} statement={p.statement} evidence={p.evidence} isNew onPress={() => router.push({ pathname: '/patron/[id]', params: { id: p.id } })} />
    </View>
  );
}
