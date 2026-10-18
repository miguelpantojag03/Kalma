import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { Banner, Button, EmptyState, KText, PatternCard, ProgressRing } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { usePatterns } from '@/lib/usePatterns';
import { useKalma } from '@/lib/store';
import { space } from '@/theme';

/**
 * Patrones. Bloqueada hasta tener datos suficientes (D12). Cada patrón muestra su nivel de confianza
 * (palabra + puntos) y una frase con números, nunca causal. Aviso permanente: correlación ≠ diagnóstico.
 */
export function PatternsScreen() {
  const reduce = useReducedMotion();
  const a = usePatterns();
  const seen = useKalma((s) => s.seenPatterns);
  const [showDismissed, setShowDismissed] = useState(false);

  const open = (id: string) => router.push({ pathname: '/patron/[id]', params: { id } });

  if (!a.ready) {
    return (
      <Screen tab title="Patrones">
        <EmptyState
          kind="locked"
          visual={<ProgressRing value={a.days} max={14} size={120} label={`${a.days} de 14 días para desbloquear Patrones`} />}
          title="Necesito 14 días para buscar patrones"
          description="Con menos datos podría mostrarte coincidencias que no significan nada. Vas muy bien."
        />
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
