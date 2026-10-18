import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';
import { Banner, BottomSheet, Button, Chip, ChipGroup, EventCard, KText, TextField, useToast } from '@/components/ui';
import { formatTime, partOfDay } from '@/lib/dates';
import { describeEvent } from '@/lib/describeEvent';
import type { Extraction, ExtractedEvent, StoredEvent } from '@/lib/schema';
import { applyFollowUpAnswer } from '@/mocks/extractEntry';
import { layout, space } from '@/theme';
import { EventEditorSheet } from './EventEditorSheet';

export interface ConfirmViewProps {
  extraction: Extraction;
  transcript: string;
  recordedAt: Date;
  /** Volver a analizar con texto extra ("Agregar algo que faltó"). */
  onAddMore: (extra: string) => void;
  onSave: (events: ExtractedEvent[]) => void;
  onDiscard: () => void;
  /** Quién lo entendió: se dice con transparencia (consentimiento «Entender lo que digo con IA»). */
  engine?: 'gemini' | 'local';
}

/** Cada tarjeta lleva id estable e índice original: quitar o editar no corre las marcas a otra tarjeta. */
interface Item {
  id: number;
  orig: number;
  ev: ExtractedEvent;
  edited: boolean;
}

const asStored = (e: ExtractedEvent, i: number): StoredEvent => ({ ...e, id: `draft-${i}`, entryId: 'draft', edited: false });

function whenLabel(e: ExtractedEvent) {
  if (!e.occurred_at) return undefined;
  if (e.occurred_at_precision === 'part_of_day') return partOfDay(e.occurred_at).replace(/^./, (x) => x.toUpperCase());
  return `${e.occurred_at_precision === 'approximate' ? 'aprox. ' : ''}${formatTime(e.occurred_at)}`;
}

/**
 * Todo lo que la IA extrajo es visible y editable ANTES de guardarse (principio 3 del brief).
 * Máximo una pregunta de seguimiento, que se puede saltar.
 */
export function ConfirmView({ extraction, transcript, recordedAt, onAddMore, onSave, onDiscard, engine }: ConfirmViewProps) {
  const reduce = useReducedMotion();
  const showToast = useToast((s) => s.show);
  const [items, setItems] = useState<Item[]>(() => extraction.events.map((ev, i) => ({ id: i, orig: i, ev, edited: false })));
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [extra, setExtra] = useState('');
  const [askFollowUp, setAskFollowUp] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const followUp = extraction.follow_up;
  const events = items.map((it) => it.ev);
  // La pregunta solo aplica si su evento sigue ahí y la persona no lo corrigió ya a mano.
  const targetPos = items.findIndex((it) => it.orig === followUp.target_event_index && !it.edited);
  const lowCount = items.filter((it) => it.ev.confidence < 0.6 && !it.edited).length;

  const remove = (id: number) => {
    const pos = items.findIndex((it) => it.id === id);
    const removed = items[pos]!;
    setItems((xs) => xs.filter((it) => it.id !== id));
    const { title } = describeEvent(asStored(removed.ev, pos));
    showToast({
      message: `Quité «${title}»`,
      actionLabel: 'Deshacer',
      tone: 'info',
      onAction: () => setItems((xs) => [...xs.slice(0, pos), removed, ...xs.slice(pos)]),
    });
  };

  const save = () => {
    if (followUp.question && targetPos >= 0 && !answer) {
      setAskFollowUp(true);
      return;
    }
    onSave(events);
  };

  const finishFollowUp = (a: string | null) => {
    setAskFollowUp(false);
    if (a && targetPos >= 0) {
      onSave(applyFollowUpAnswer({ ...extraction, events, follow_up: { ...followUp, target_event_index: targetPos } }, a));
    } else {
      onSave(events);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: layout.gutter, paddingBottom: space[6], gap: space[3] }}>
        <KText variant="title">Esto entendí</KText>
        <KText tone="muted">Revisa que esté bien. Toca «Editar» si algo no es así.</KText>
        {engine && <KText variant="caption" tone="muted">{engine === 'gemini' ? 'Entendido con IA (Google Gemini)' : 'Entendido en tu celular, sin IA'}</KText>}

        {lowCount > 0 && (
          <Banner tone="warning" title="Revisa lo que marqué" message={lowCount === 1 ? 'Marqué con un punto lo que no tengo tan claro.' : `Marqué con un punto ${lowCount} cosas que no tengo tan claras.`} />
        )}
        {items.length === 0 && (
          <Banner
            tone="info"
            title={extraction.events.length === 0 ? 'No encontré nada para guardar' : 'Quitaste todo'}
            message="Puedes agregar algo que faltó o descartar este registro."
          />
        )}

        {items.map(({ id, ev: e, edited }, i) => {
          const d = describeEvent(asStored(e, i));
          return (
            <Animated.View key={id} entering={reduce ? FadeIn : FadeInDown.delay(i * 90).duration(320)} layout={reduce ? undefined : LinearTransition}>
              <EventCard
                type={e.type}
                title={d.title}
                detail={d.detail}
                time={whenLabel(e)}
                intensity={d.intensity}
                confidence={edited ? 1 : e.confidence}
                sourceText={e.source_text}
                edited={edited}
                onEdit={() => setEditing(id)}
                onRemove={() => remove(id)}
              />
            </Animated.View>
          );
        })}

        {adding ? (
          <View style={{ gap: space[2] }}>
            <TextField label="¿Qué faltó?" placeholder="Ej.: también me tomé un tinto" value={extra} onChangeText={setExtra} autoFocus />
            <Button
              fullWidth
              label="Agregar"
              disabled={extra.trim().length < 2}
              onPress={() => {
                onAddMore(extra.trim());
                setExtra('');
                setAdding(false);
              }}
            />
          </View>
        ) : (
          <Button variant="ghost" fullWidth label="Agregar algo que faltó" icon={(c) => <Plus size={20} color={c} />} onPress={() => setAdding(true)} />
        )}

        <KText variant="caption" tone="muted" style={{ marginTop: space[2] }}>
          Lo que dijiste: “{transcript}”
        </KText>
      </ScrollView>

      <View style={{ paddingHorizontal: layout.gutter, paddingTop: space[2], gap: space[2] }}>
        <Button fullWidth size="lg" label="Guardar" disabled={items.length === 0} onPress={save} />
        <Button fullWidth variant="ghost" label="Descartar" onPress={onDiscard} />
      </View>

      <EventEditorSheet
        event={editing !== null ? (items.find((it) => it.id === editing)?.ev ?? null) : null}
        baseDate={recordedAt}
        onClose={() => setEditing(null)}
        onSave={(ev) => {
          setItems((xs) => xs.map((it) => (it.id === editing ? { ...it, ev, edited: true } : it)));
          setEditing(null);
        }}
      />

      <BottomSheet
        open={askFollowUp}
        onClose={() => finishFollowUp(null)}
        title={followUp.question ?? ''}
        description="Una sola pregunta. Puedes saltarla."
        footer={
          <>
            <Button fullWidth label="Listo" disabled={!answer} onPress={() => finishFollowUp(answer)} />
            <Button fullWidth variant="ghost" label="Saltar" onPress={() => finishFollowUp(null)} />
          </>
        }
      >
        <ChipGroup label={followUp.question ?? ''} hideLabel>
          {followUp.quick_replies.map((q) => (
            <Chip key={q} label={q} selected={answer === q} onPress={() => setAnswer(q)} />
          ))}
        </ChipGroup>
      </BottomSheet>
    </View>
  );
}
