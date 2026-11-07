import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, Stack, useLocalSearchParams, type Href } from 'expo-router';
import { FileText, Phone, Sparkles, Smartphone } from 'lucide-react-native';
import { Banner, Button, Card, Chip, ChipGroup, EmptyState, KText } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { chooseRelief, type Engine } from '@/lib/ai';
import { haptic } from '@/lib/haptics';
import {
  findSymptom, HELPED_LABEL, KIND_LABEL, reliefContext, reliefTries, SEEK_CARE, type Helped, type ReliefIdea,
} from '@/lib/relief';
import { useKalma } from '@/lib/store';
import { radius, space, useTheme } from '@/theme';

/**
 * "Mientras tanto": ideas generales para sentirse mejor después de anotar un síntoma (D90).
 * - La IA solo ELIGE de una lista revisada (relief.ts); nunca medicamentos, dosis ni causas.
 * - Lo que la persona prueba queda en el síntoma y sale en el reporte para el médico.
 * - Siempre muestra cuándo buscar atención y un acceso a emergencias.
 */
export function ReliefScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const entries = useKalma((s) => s.entries);
  const logRelief = useKalma((s) => s.logRelief);
  const ref = useMemo(() => (id ? findSymptom(entries, id) : null), [entries, id]);
  const [result, setResult] = useState<{ ideas: ReliefIdea[]; engine: Engine } | null>(null);

  // Se elige una vez al abrir: si cambiara mientras la persona lee, perdería su lugar
  const refKey = ref ? `${ref.event.id}` : null;
  useEffect(() => {
    if (!ref) return;
    let alive = true;
    void chooseRelief(ref.kind, ref.name, { ...reliefContext(entries, ref), said: ref.entry.transcript }).then((r) => {
      if (alive) setResult(r);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refKey]);

  if (!ref) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Mientras tanto' }} />
        <Screen edges={[]}>
          <View style={{ height: space[3] }} />
          <EmptyState kind="no-data" title="Ya no encuentro ese síntoma" description="Puede que lo hayas borrado. Si te sientes mal, anótalo de nuevo desde Hoy." />
        </Screen>
      </>
    );
  }

  const intensity = (ref.event.data as { intensity_0_10?: number | null }).intensity_0_10 ?? null;
  const tries = new Map(reliefTries(ref.event).map((t) => [t.id, t]));
  const care = SEEK_CARE[ref.kind];

  const mark = (ideaId: string, helped: Helped | null) => {
    haptic.tap();
    logRelief(ref.event.id, ideaId, helped);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Mientras tanto' }} />
      <Screen edges={[]}>
        <View style={{ gap: space[2], paddingTop: space[3] }}>
          <KText variant="title">Para {KIND_LABEL[ref.kind]}</KText>
          <KText tone="muted">Ideas generales para sentirte mejor mientras hablas con tu médico. No reemplazan su consejo.</KText>
        </View>

        {intensity !== null && intensity >= 8 && (
          <Banner
            tone="warning"
            title={`Anotaste un ${intensity} de 10`}
            message="Es un malestar fuerte. Si no mejora o empeora, busca atención. Si tu médico ya te dijo qué hacer en estos casos, síguelo."
          />
        )}

        {!result ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }} accessibilityLiveRegion="polite">
            <ActivityIndicator color={c.primaryStrong} />
            <KText tone="muted">Buscando ideas para ti…</KText>
          </Card>
        ) : (
          <View style={{ gap: space[3] }}>
            {result.ideas.map((idea, i) => {
              const tried = tries.get(idea.id);
              return (
                <Card key={idea.id} style={{ gap: space[3] }}>
                  <View style={{ flexDirection: 'row', gap: space[3], alignItems: 'flex-start' }}>
                    <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                      <KText variant="smallStrong" importantForAccessibility="no">{i + 1}</KText>
                    </View>
                    <View style={{ flex: 1, gap: space[1] }}>
                      <KText variant="subheading">{idea.title}</KText>
                      <KText variant="small" tone="muted">{idea.text}</KText>
                    </View>
                  </View>
                  {!tried ? (
                    <Button variant="secondary" label="Lo probé" accessibilityHint="Lo anoto para tu reporte" onPress={() => mark(idea.id, null)} />
                  ) : (
                    <ChipGroup label={`¿Te ayudó ${idea.title.charAt(0).toLowerCase()}${idea.title.slice(1)}?`} hideLabel>
                      <KText variant="smallStrong" style={{ alignSelf: 'center', marginRight: space[1] }}>¿Te ayudó?</KText>
                      {(['yes', 'some', 'no'] as const).map((h) => (
                        <Chip key={h} compact label={HELPED_LABEL[h]} selected={tried.helped === h} onPress={() => mark(idea.id, h)} />
                      ))}
                    </ChipGroup>
                  )}
                </Card>
              );
            })}
            {/* Transparencia de la IA, como en el registro (D81) */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              {result.engine === 'gemini' ? <Sparkles size={16} color={c.muted} /> : <Smartphone size={16} color={c.muted} />}
              <KText variant="caption" tone="muted" style={{ flex: 1 }}>
                {result.engine === 'gemini' ? 'Elegidas con IA (Google Gemini) de una lista revisada por Kalma' : 'Elegidas en tu celular, de una lista revisada por Kalma'}
              </KText>
            </View>
          </View>
        )}

        <Card tone="outline" style={{ gap: space[3] }}>
          <KText variant="subheading">Busca atención de inmediato si…</KText>
          <KText variant="small">{care.urgent}</KText>
          <Button variant="danger" label="Es una emergencia" icon={(col) => <Phone size={20} color={col} />} onPress={() => router.push({ pathname: '/emergencia', params: { tipo: 'physical' } })} />
          <View style={{ height: 1, backgroundColor: c.border }} />
          <KText variant="smallStrong">Habla pronto con tu médico si…</KText>
          <KText variant="small" tone="muted">{care.soon}</KText>
        </Card>

        <Card tone="soft" style={{ gap: space[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <FileText size={20} color={c.text} />
            <KText variant="bodyStrong" style={{ flex: 1 }}>Va en tu reporte para el médico</KText>
          </View>
          <KText variant="small">Lo que pruebes y si te ayudó aparece en tu reporte, junto con tus síntomas. Así tu médico sabe qué has intentado.</KText>
          <Button variant="ghost" label="Ver mi reporte" onPress={() => router.push('/reporte' as Href)} />
        </Card>

        <KText variant="caption" tone="muted">
          Si tu médico ya te indicó un medicamento o un plan para esto, sigue sus indicaciones.
        </KText>
      </Screen>
    </>
  );
}
