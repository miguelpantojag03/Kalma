import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { parseISO } from 'date-fns';
import { EventCard, KText, useToast } from '@/components/ui';
import { formatTime, partOfDay, type PartOfDay } from '@/lib/dates';
import { describeEvent } from '@/lib/describeEvent';
import type { ExtractedEvent, StoredEvent } from '@/lib/schema';
import { useKalma } from '@/lib/store';
import { space } from '@/theme';
import { EventEditorSheet } from '@/features/recording/EventEditorSheet';

const ORDER: PartOfDay[] = ['madrugada', 'mañana', 'tarde', 'noche'];
const TITLE: Record<PartOfDay, string> = { madrugada: 'Madrugada', mañana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };

/**
 * Línea de tiempo de un día, agrupada por momento (Gestalt: proximidad y región común).
 * Cada evento se puede corregir o quitar, con "Deshacer" (Nielsen #3).
 */
export function DayTimeline({ events, baseDate }: { events: StoredEvent[]; baseDate: Date }) {
  const reduce = useReducedMotion();
  const { updateEvent, removeEvent, undoRemove } = useKalma();
  const showToast = useToast((s) => s.show);
  const [editing, setEditing] = useState<StoredEvent | null>(null);

  const groups = ORDER.map((p) => ({ p, items: events.filter((e) => e.occurred_at && partOfDay(e.occurred_at) === p) })).filter((g) => g.items.length > 0);

  return (
    <View style={{ gap: space[5] }}>
      {groups.map(({ p, items }) => (
        <View key={p} style={{ gap: space[3] }} accessibilityRole="list" accessibilityLabel={`${TITLE[p]}, ${items.length} ${items.length === 1 ? 'registro' : 'registros'}`}>
          <KText variant="subheading" tone="muted">{TITLE[p]}</KText>
          {items.map((e) => {
            const d = describeEvent(e);
            return (
              <Animated.View key={e.id} entering={reduce ? undefined : FadeIn.duration(250)} layout={reduce ? undefined : LinearTransition}>
                <EventCard
                  type={e.type}
                  title={d.title}
                  detail={d.detail}
                  time={e.occurred_at ? formatTime(e.occurred_at) : undefined}
                  intensity={d.intensity}
                  edited={e.edited}
                  onPress={() => setEditing(e)}
                />
              </Animated.View>
            );
          })}
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
