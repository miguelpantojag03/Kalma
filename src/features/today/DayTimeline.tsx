import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { parseISO } from 'date-fns';
import { Card, EVENT_ICON, IntensityBadge, KText, PressableScale, useToast } from '@/components/ui';
import { EVENT_TYPE_LABEL } from '@/lib/types';
import { formatTime, partOfDay, type PartOfDay } from '@/lib/dates';
import { describeEvent } from '@/lib/describeEvent';
import type { ExtractedEvent, StoredEvent } from '@/lib/schema';
import { useKalma } from '@/lib/store';
import { radius, space, touch, useTheme } from '@/theme';
import { EventEditorSheet } from '@/features/recording/EventEditorSheet';

const ORDER: PartOfDay[] = ['madrugada', 'mañana', 'tarde', 'noche'];
const TITLE: Record<PartOfDay, string> = { madrugada: 'Madrugada', mañana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };

/**
 * Línea de tiempo de un día, agrupada por momento (Gestalt: proximidad y región común).
 * Cada evento se puede corregir o quitar, con "Deshacer" (Nielsen #3).
 */
export function DayTimeline({ events, baseDate }: { events: StoredEvent[]; baseDate: Date }) {
  const reduce = useReducedMotion();
  const { c } = useTheme();
  const { updateEvent, removeEvent, undoRemove } = useKalma();
  const showToast = useToast((s) => s.show);
  const [editing, setEditing] = useState<StoredEvent | null>(null);

  const groups = ORDER.map((p) => ({ p, items: events.filter((e) => e.occurred_at && partOfDay(e.occurred_at) === p) })).filter((g) => g.items.length > 0);

  return (
    <View style={{ gap: space[5] }}>
      {groups.map(({ p, items }) => (
        <View key={p} style={{ gap: space[3] }} accessibilityRole="list" accessibilityLabel={`${TITLE[p]}, ${items.length} ${items.length === 1 ? 'registro' : 'registros'}`}>
          <KText variant="subheading" tone="muted">{TITLE[p]}</KText>
          {/* Una tarjeta por momento del día con filas (D92): antes, una tarjeta con sombra por registro */}
          <Card style={{ paddingVertical: space[1], paddingHorizontal: 0 }}>
            {items.map((e, i) => {
              const d = describeEvent(e);
              return (
                <Animated.View key={e.id} entering={reduce ? undefined : FadeIn.duration(250)} layout={reduce ? undefined : LinearTransition}>
                  {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: space[4] + 40 + space[3] }} />}
                  <EventRow event={e} title={d.title} detail={d.detail} intensity={d.intensity} onPress={() => setEditing(e)} />
                </Animated.View>
              );
            })}
          </Card>
        </View>
      ))}

      <EventEditorSheet
        event={editing}
        baseDate={editing?.occurred_at ? parseISO(editing.occurred_at) : baseDate}
        onClose={() => setEditing(null)}
        onSave={(ev: ExtractedEvent) => {
          if (editing) updateEvent(editing.id, { occurred_at: ev.occurred_at, occurred_at_precision: ev.occurred_at_precision, data: ev.data as Record<string, unknown> });
          setEditing(null);
          showToast({ message: 'Listo, lo corregí' });
        }}
        onRemove={() => {
          if (!editing) return;
          const { title } = describeEvent(editing);
          removeEvent(editing.id);
          setEditing(null);
          showToast({ message: `Quité «${title}»`, actionLabel: 'Deshacer', tone: 'info', onAction: undoRemove });
        }}
      />
    </View>
  );
}

/** Fila de un registro dentro del día: ícono, qué fue, cuándo y (si es síntoma) la intensidad. */
function EventRow({ event: e, title, detail, intensity, onPress }: { event: StoredEvent; title: string; detail?: string; intensity?: number; onPress: () => void }) {
  const { c } = useTheme();
  const Icon = EVENT_ICON[e.type];
  const time = e.occurred_at ? formatTime(e.occurred_at) : undefined;
  const meta = [time, detail].filter(Boolean).join(' · ');
  const symptom = e.type === 'symptom';
  return (
    <PressableScale
      weight="card"
      accessibilityRole="button"
      accessibilityLabel={[`${EVENT_TYPE_LABEL[e.type]}: ${title}`, meta, intensity !== undefined ? `intensidad ${intensity} de 10` : null, e.edited ? 'editado por ti' : null].filter(Boolean).join('. ')}
      accessibilityHint="Toca para corregir o quitar"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: touch.min + 16,
        paddingHorizontal: space[4], paddingVertical: space[3], borderRadius: radius.md,
        backgroundColor: pressed ? c.surfaceMuted : 'transparent',
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: symptom ? c.intensity[3] : c.accent }}>
        <Icon size={20} strokeWidth={2.25} color={symptom ? c.onIntensity : c.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <KText variant="bodyStrong" numberOfLines={2}>{title}</KText>
        {!!meta && <KText variant="small" tone="muted" numberOfLines={2}>{meta}</KText>}
      </View>
      {intensity !== undefined && <IntensityBadge value={intensity} />}
    </PressableScale>
  );
}
