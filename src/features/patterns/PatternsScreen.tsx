import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { Banner, Button, Card, EmptyState, KText, PatternCard, ProgressRing } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { usePatterns } from '@/lib/usePatterns';
import { medicationUse } from '@/lib/insights';
import { EARLY_DAYS, earlyHints } from '@/lib/patterns';
import { DAYS_FOR_ANALYSIS } from '@/lib/selectors';
import { useKalma } from '@/lib/store';
import { radius, space, useTheme } from '@/theme';

/**
 * Patrones. Con 5 a 13 días muestra pistas tempranas (D83); los patrones esperan a los 14 días (D12). Cada patrón muestra su nivel de confianza
 * (palabra + puntos) y una frase con números, nunca causal. Aviso permanente: correlación ≠ diagnóstico.
 */
export function PatternsScreen() {
  const reduce = useReducedMotion();
  const a = usePatterns();
  const seen = useKalma((s) => s.seenPatterns);
  const entries = useKalma((s) => s.entries);
  const meds = useMemo(() => medicationUse(entries), [entries]);
  const hints = useMemo(() => earlyHints(entries), [entries]);
  const [showDismissed, setShowDismissed] = useState(false);

  const open = (id: string) => router.push({ pathname: '/patron/[id]', params: { id } });

  if (!a.ready) {
    const toHints = EARLY_DAYS - a.days;
    const toPatterns = DAYS_FOR_ANALYSIS - a.days;
    return (
      <Screen tab title="Patrones" subtitle={a.days >= EARLY_DAYS ? `Llevas ${a.days} días: primeras pistas` : undefined}>
        {a.days < EARLY_DAYS ? (
          <EmptyState
            kind="locked"
            visual={<ProgressRing value={a.days} max={EARLY_DAYS} size={120} label={`${a.days} de ${EARLY_DAYS} días para las primeras pistas`} />}
            title={`En ${toHints} ${toHints === 1 ? 'día' : 'días'} te muestro las primeras pistas`}
            description={`Con ${EARLY_DAYS} días busco coincidencias muy marcadas; a los ${DAYS_FOR_ANALYSIS}, patrones confirmados. Cuéntame tu día, sin importar cuándo.`}
          />
        ) : (
          <>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space[4] }}>
              <ProgressRing value={a.days} max={DAYS_FOR_ANALYSIS} label={`${a.days} de ${DAYS_FOR_ANALYSIS} días para los patrones confirmados`} />
              <View style={{ flex: 1, gap: space[1] }}>
                <KText variant="subheading">Faltan {toPatterns} {toPatterns === 1 ? 'día' : 'días'} para los patrones confirmados</KText>
                <KText variant="small" tone="muted">Mientras tanto, estas son las coincidencias más marcadas.</KText>
              </View>
            </Card>
            <Banner
              tone="warning"
              title="Son pistas tempranas: con pocos días pueden ser casualidad"
              message={`No dejes de comer algo ni cambies nada importante solo por una pista. A los ${DAYS_FOR_ANALYSIS} días te digo cuáles se confirman.`}
            />
            {hints.length > 0 ? (
              <View style={{ gap: space[3] }}>
                <KText variant="heading">{hints.length === 1 ? 'Una pista' : `${hints.length} pistas`} por ahora</KText>
                {hints.map((h) => <HintCard key={h.id} statement={h.statement} contrast={h.contrast} />)}
              </View>
            ) : (
              <EmptyState kind="no-data" title="Aún no veo pistas claras" description="Eso también dice algo: por ahora nada se repite lo suficiente. Sigue registrando." />
            )}
          </>
        )}
        <Banner tone="info" title="Si te sientes muy mal, no esperes a Kalma" message="Habla con tu médico. Si es una emergencia, llama al 123." />
      </Screen>
    );
  }

  return (
    <Screen tab title="Patrones" subtitle={`Analicé ${a.days} días de registros.`}>
      {/* Momento de recompensa al desbloquear (la animación se omite con "reducir movimiento") */}
      <Animated.View entering={reduce ? undefined : ZoomIn.duration(500)}>
        <Banner
          tone="info"
          title="Son coincidencias en tus datos, no un diagnóstico"
          message="Un patrón dice qué suele pasar junto, no qué lo causa. Llévalo a tu consulta para conversarlo con tu médico."
        />
      </Animated.View>

      {/* Uso frecuente de analgésicos: solo el dato y a quién preguntar; nunca "deja de tomarlo" (D76) */}
      {meds.frequent && (
        <Banner
          tone="warning"
          title={`Anotaste medicamentos para el dolor ${meds.days} de los últimos 30 días`}
          message="Cuando se usan muy seguido, a veces el dolor de cabeza cambia. Coméntalo con tu médico y no cambies nada por tu cuenta."
        />
      )}

      {a.visible.length === 0 ? (
        <EmptyState kind="no-data" title="Todavía no veo patrones claros" description="Sigue registrando: con más días, las coincidencias reales se notan más. Vas muy bien." />
      ) : (
        <View style={{ gap: space[3] }}>
          <KText variant="heading">
            {a.visible.length === 1 ? 'Encontré 1 cosa que te puede interesar' : `Encontré ${a.visible.length} cosas que te pueden interesar`}
          </KText>
          {a.visible.map((p, i) => (
            <Animated.View key={p.id} entering={reduce ? undefined : FadeInDown.delay(i * 90).duration(300)}>
              <PatternCard level={p.level} statement={p.statement} evidence={p.evidence} isNew={!seen.includes(p.id)} onPress={() => open(p.id)} />
            </Animated.View>
          ))}
        </View>
      )}

      <Button fullWidth variant="secondary" label="Preparar reporte para el médico" icon={(col) => <FileText size={20} color={col} />} onPress={() => router.push('/reporte')} />

      <KText variant="small" tone="muted">
        Niveles: <KText variant="smallStrong">Posible</KText> puede ser casualidad · <KText variant="smallStrong">Probable</KText> se repite más de lo esperado · <KText variant="smallStrong">Fuerte</KText> se repite mucho, con 30 días o más.
      </KText>

      {a.dismissed.length > 0 && (
        <View style={{ gap: space[3] }}>
          <Button variant="ghost" fullWidth label={showDismissed ? 'Ocultar los que no te parecieron útiles' : `Ver ${a.dismissed.length} que no te parecieron útiles`} onPress={() => setShowDismissed((v) => !v)} />
          {showDismissed && a.dismissed.map((p) => <PatternCard key={p.id} level={p.level} statement={p.statement} evidence={p.evidence} dismissed onPress={() => open(p.id)} />)}
        </View>
      )}
    </Screen>
  );
}

/** Pista temprana: borde punteado (como «sin registro» en el calendario: algo todavía incompleto). */
function HintCard({ statement, contrast }: { statement: string; contrast: string }) {
  const { c } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`Pista temprana. ${statement} ${contrast} Puede ser casualidad.`}
      style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: c.borderStrong, borderRadius: radius.lg, padding: space[4], gap: space[2], backgroundColor: c.surface }}
    >
      <View style={{ alignSelf: 'flex-start', paddingHorizontal: space[3], paddingVertical: 2, borderRadius: radius.full, backgroundColor: c.surfaceMuted }}>
        <KText variant="caption" tone="muted">PISTA TEMPRANA</KText>
      </View>
      <KText variant="subheading">{statement}</KText>
      <KText variant="small" tone="muted">{contrast}</KText>
    </View>
  );
}
