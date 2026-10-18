import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, FileText, FlaskConical, ThumbsDown } from 'lucide-react-native';
import { Banner, Button, Card, Chip, CompareBars, EmptyState, KText, PatternLevelBadge, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { shortDate } from '@/lib/dates';
import type { WindowId } from '@/lib/patterns';
import { useKalma } from '@/lib/store';
import { usePatterns } from '@/lib/usePatterns';
import { space, useTheme } from '@/theme';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const BEFORE: Record<WindowId, string> = {
  '0-6h': 'en las 6 horas antes',
  '6-24h': 'entre 6 y 24 horas antes',
  '24-48h': 'uno o dos días antes',
  'prev-day': 'el día anterior',
};

/**
 * Detalle de un patrón: los números, el gráfico con vs. sin el factor, los días que lo sustentan,
 * cómo se calculó (en lenguaje simple) y acciones. Nunca sugiere tratamientos ni medicamentos.
 */
export function PatternDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const a = usePatterns();
  const p = a.patterns.find((x) => x.id === id);
  const { reportPatterns, dismissedPatterns, togglePatternInReport, togglePatternDismissed, markPatternSeen } = useKalma();
  const showToast = useToast((s) => s.show);
  const [how, setHow] = useState(false);

  useEffect(() => {
    if (p) markPatternSeen(p.id);
  }, [p, markPatternSeen]);

  if (!p) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Patrón' }} />
        <EmptyState kind="no-data" title="Este patrón ya no aparece" description="Con los registros nuevos dejó de cumplir los mínimos. Es normal: los patrones cambian con más datos." />
      </Screen>
    );
  }

  const inReport = reportPatterns.includes(p.id);
  const dismissed = dismissedPatterns.includes(p.id);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: cap(p.outcome) }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        <PatternLevelBadge level={p.level} />
        <KText variant="title">{p.statement}</KText>

        <Card style={{ gap: space[4] }}>
          <KText variant="subheading">Con vs. sin {p.factorShort.toLowerCase()}</KText>
          <CompareBars
            summary={p.comparison}
            rows={[
              { label: `Días con ${p.factorShort.toLowerCase()}`, value: p.rateWith, detail: `${p.table.a} de ${p.table.a + p.table.b} días tuviste ${p.outcome}`, emphasis: true },
              { label: `Días sin ${p.factorShort.toLowerCase()}`, value: p.rateWithout, detail: `${p.table.c} de ${p.table.c + p.table.d} días tuviste ${p.outcome}` },
            ]}
          />
          <KText variant="small" tone="muted">{p.comparison}</KText>
        </Card>

        <Card style={{ gap: space[3] }}>
          <KText variant="subheading">Días que lo sustentan</KText>
          <KText variant="small" tone="muted">Toca un día para ver qué registraste.</KText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
            {p.supportingDays.map((d) => (
              <Chip key={d} compact label={shortDate(d)} onPress={() => router.push({ pathname: '/dia/[fecha]', params: { fecha: d } })} />
            ))}
          </View>
        </Card>

        <Banner
          tone="info"
          title="Correlación, no diagnóstico"
          message="Esto muestra que dos cosas suelen pasar juntas en tus datos. No prueba que una cause la otra. Coméntalo con tu médico antes de cambiar algo importante."
        />

        <View style={{ gap: space[2] }}>
          <Button
            fullWidth
            label="Probar un experimento"
            icon={(col) => <FlaskConical size={20} color={col} />}
            onPress={() => router.push({ pathname: '/experimentos/nuevo', params: { patron: p.id } })}
          />
          <Button
            fullWidth
            variant="secondary"
            label={inReport ? 'Quitar del reporte' : 'Incluir en el reporte'}
            icon={(col) => <FileText size={20} color={col} />}
            onPress={() => {
              togglePatternInReport(p.id);
              showToast({ message: inReport ? 'Lo quité del reporte' : 'Lo agregué al reporte para tu médico', tone: 'info' });
            }}
          />
          <Button
            fullWidth
            variant="ghost"
            label={dismissed ? 'Volver a mostrar' : 'No me parece útil'}
            icon={(col) => <ThumbsDown size={20} color={col} />}
            onPress={() => {
              togglePatternDismissed(p.id);
              if (!dismissed) {
                showToast({ message: 'Listo, no lo mostraré arriba', actionLabel: 'Deshacer', onAction: () => togglePatternDismissed(p.id) });
                router.back();
              }
            }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: how }}
          onPress={() => setHow((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 48 }}
        >
          <KText variant="bodyStrong" style={{ flex: 1 }}>¿Cómo lo calculé?</KText>
          {how ? <ChevronUp size={20} color={c.text} /> : <ChevronDown size={20} color={c.text} />}
        </Pressable>
        {how && (
          <Card tone="outline" style={{ gap: space[2] }}>
            <KText variant="small">• Revisé {p.days} días. Tuviste {p.outcome} en {p.episodes} de ellos.</KText>
            <KText variant="small">• Miré si hubo {p.factorShort.toLowerCase()} {BEFORE[p.window]} de cada episodio.</KText>
            <KText variant="small">• Con {p.factorShort.toLowerCase()} fue {p.rr.toFixed(1)} veces más frecuente que sin.</KText>
            <KText variant="small">• Probé {a.tested} combinaciones en total y ajusté por eso, para que la casualidad no parezca patrón (q = {p.q < 0.001 ? '< 0,001' : p.q.toFixed(3).replace('.', ',')}).</KText>
            <KText variant="small" tone="muted">Prueba exacta de Fisher con corrección de Benjamini–Hochberg. Posible: 1,5 veces o más · Probable: además q &lt; 0,2 y 6 episodios · Fuerte: además q &lt; 0,05 y 30 días.</KText>
          </Card>
        )}
      </Screen>
    </>
  );
}
