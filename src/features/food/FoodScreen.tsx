import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { addDays, isToday, isYesterday } from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Lightbulb, Plus, Utensils } from 'lucide-react-native';
import { Banner, Button, Card, KText } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { dayKey, formatTime, fromDayKey, fullDate } from '@/lib/dates';
import { MEAL_LABEL, MEAL_ORDER, mealsForDay, weekFood } from '@/lib/food';
import { GENERAL_TIPS, personalTips, tipOfTheDay, TIPS_NOTE, type Tip } from '@/lib/tips';
import { useKalma } from '@/lib/store';
import { usePatterns } from '@/lib/usePatterns';
import { radius, space, touch, useTheme } from '@/theme';

const CATEGORY_LABEL: Record<string, string> = {
  lácteo: 'Lácteos', cafeína: 'Cafeína', harina: 'Harinas', frito: 'Fritos', grasa: 'Grasa', azúcar: 'Azúcar',
  alcohol: 'Alcohol', verdura: 'Verduras', fruta: 'Frutas', huevo: 'Huevo', maíz: 'Maíz', sopa: 'Sopa',
  carne: 'Carne', cacao: 'Chocolate', 'comida casera': 'Comida casera',
};
const catLabel = (c: string) => CATEGORY_LABEL[c] ?? c.charAt(0).toUpperCase() + c.slice(1);

function dayTitle(key: string) {
  const d = fromDayKey(key);
  if (isToday(d)) return 'Hoy';
  if (isYesterday(d)) return 'Ayer';
  const s = fullDate(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Comidas y consejos. El diario sale de lo que ya se registra (no hay que anotar dos veces) y no
 * califica la comida: sin calorías, sin "bueno/malo". Los consejos son generales o nacen de los
 * patrones de la persona, siempre como coincidencia y con la salida segura del experimento (D59).
 */
export function FoodScreen() {
  const { c } = useTheme();
  const entries = useKalma((s) => s.entries);
  const { visible } = usePatterns();
  const [key, setKey] = useState(() => dayKey(new Date()));
  const [allTips, setAllTips] = useState(false);

  const meals = useMemo(() => mealsForDay(entries, key), [entries, key]);
  const week = useMemo(() => weekFood(entries), [entries]);
  const mine = useMemo(() => personalTips(visible, week), [visible, week]);
  const daily = tipOfTheDay();
  const isTodayKey = key === dayKey(new Date());
  const total = MEAL_ORDER.reduce((n, m) => n + meals[m].length, 0);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Comidas y consejos' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />

        {/* Día */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Día anterior" hitSlop={8} onPress={() => setKey(dayKey(addDays(fromDayKey(key), -1)))} style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={24} color={c.text} />
          </Pressable>
          <KText variant="heading" accessibilityRole="header">{dayTitle(key)}</KText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Día siguiente"
            accessibilityState={{ disabled: isTodayKey }}
            disabled={isTodayKey}
            hitSlop={8}
            onPress={() => setKey(dayKey(addDays(fromDayKey(key), 1)))}
            style={{ width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center', opacity: isTodayKey ? 0.3 : 1 }}
          >
            <ChevronRight size={24} color={c.text} />
          </Pressable>
        </View>

        <Card style={{ gap: space[3] }}>
          {MEAL_ORDER.map((m) => (
            <View key={m} style={{ gap: space[1] }}>
              <KText variant="smallStrong" tone="muted">{MEAL_LABEL[m].toUpperCase()}</KText>
              {meals[m].length === 0 ? (
                <KText variant="small" tone="muted">Sin anotar</KText>
              ) : (
                meals[m].map((f) => (
                  <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
                    <Utensils size={16} color={c.muted} />
                    <KText style={{ flex: 1 }}>
                      {f.data.name}
                      {f.data.categories.length > 0 && <KText variant="small" tone="muted">{`  ·  ${f.data.categories.slice(0, 2).map(catLabel).join(', ')}`}</KText>}
                    </KText>
                    {f.occurred_at && <KText variant="small" tone="muted">{formatTime(f.occurred_at)}</KText>}
                  </View>
                ))
              )}
            </View>
          ))}
          <Button
            variant="secondary"
            fullWidth
            label={total === 0 ? 'Anotar lo que comí' : 'Agregar algo más'}
            icon={(col) => <Plus size={20} color={col} />}
            onPress={() => router.push({ pathname: '/registro', params: isTodayKey ? { auto: '1' } : { fecha: key } })}
          />
        </Card>

        {/* Semana */}
        {week.daysWithFood >= 2 && (
          <Card style={{ gap: space[3] }}>
            <KText variant="subheading">Tu semana</KText>
            <KText variant="small" tone="muted">En cuántos de los últimos 7 días apareció cada cosa. No es bueno ni malo: es lo que Kalma compara con tus síntomas.</KText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}>
              {week.categoryDays.slice(0, 8).map((x) => (
                <View key={x.category} style={{ paddingHorizontal: space[3], paddingVertical: space[1], borderRadius: radius.full, backgroundColor: c.surfaceMuted }}>
                  <KText variant="small">{catLabel(x.category)} · {x.days} {x.days === 1 ? 'día' : 'días'}</KText>
                </View>
              ))}
            </View>
            {week.waterAvg !== null && <KText variant="small">Agua: unos {Math.round(week.waterAvg)} vasos al día en los días que lo anotaste.</KText>}
          </Card>
        )}

        {/* Consejos */}
        {mine.length > 0 && (
          <View style={{ gap: space[3] }}>
            <KText variant="heading" accessibilityRole="header">Para ti</KText>
            {mine.map((t) => <TipCard key={t.id} tip={t} />)}
          </View>
        )}

        <KText variant="heading" accessibilityRole="header">Idea del día</KText>
        <TipCard tip={daily} />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: allTips }}
          onPress={() => setAllTips((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: touch.min }}
        >
          <KText variant="bodyStrong">{allTips ? 'Ocultar las demás ideas' : `Ver las ${GENERAL_TIPS.length - 1} ideas restantes`}</KText>
          {allTips ? <ChevronUp size={20} color={c.text} /> : <ChevronDown size={20} color={c.text} />}
        </Pressable>
        {allTips && GENERAL_TIPS.filter((t) => t.id !== daily.id).map((t) => <TipCard key={t.id} tip={t} />)}

        <Banner tone="info" title="Ideas, no un plan de alimentación" message={TIPS_NOTE} />
      </Screen>
    </>
  );
}

function TipCard({ tip }: { tip: Tip }) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: space[2] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Lightbulb size={18} color={c.text} />
        <KText variant="caption" tone="brand" style={{ flex: 1 }}>{(tip.reason ?? tip.topic).toUpperCase()}</KText>
      </View>
      <KText variant="subheading">{tip.title}</KText>
      <KText variant="small">{tip.text}</KText>
      {tip.patternId && (
        <Button variant="ghost" label="Probar un experimento" onPress={() => router.push({ pathname: '/experimentos/nuevo', params: { patron: tip.patternId } })} />
      )}
    </Card>
  );
}
