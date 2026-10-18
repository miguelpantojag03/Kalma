import { useState } from 'react';
import { View } from 'react-native';
import { setHours, setMinutes, parseISO } from 'date-fns';
import { BottomSheet, Button, Chip, ChipGroup, IntensitySlider, KText, TextField } from '@/components/ui';
import type { ExtractedEvent } from '@/lib/schema';
import { space } from '@/theme';

const MOMENTS = [
  { label: 'Mañana', h: 9 },
  { label: 'Mediodía', h: 12 },
  { label: 'Tarde', h: 15 },
  { label: 'Noche', h: 20 },
] as const;

const RELIEF = [
  { label: 'Sí, del todo', v: 'full' },
  { label: 'Un poco', v: 'partial' },
  { label: 'No', v: 'none' },
  { label: 'Todavía no sé', v: 'unknown' },
] as const;

export interface EventEditorSheetProps {
  event: ExtractedEvent | null;
  /** Fecha base para "Mañana/Tarde/Noche" (el día del registro). */
  baseDate: Date;
  onClose: () => void;
  onSave: (e: ExtractedEvent) => void;
  /** Si se pasa, aparece "Quitar este registro" dentro de la hoja (línea de tiempo). */
  onRemove?: () => void;
}

/**
 * Corregir lo que entendió Kalma (Nielsen #3 y #5). Solo muestra los campos que importan para
 * cada tipo: menos decisiones (ley de Hick) y todo con controles grandes.
 */
export function EventEditorSheet({ event, baseDate, onClose, onSave, onRemove }: EventEditorSheetProps) {
  const [draft, setDraft] = useState<ExtractedEvent | null>(event);
  // Al abrir con otro evento, el borrador se reinicia (estado derivado en render, sin efecto).
  const [prevEvent, setPrevEvent] = useState(event);
  if (event !== prevEvent) {
    setPrevEvent(event);
    if (event) setDraft(event);
  }

  if (!draft) return <BottomSheet open={false} onClose={onClose} title="" />;

  const setMoment = (h: number) => {
    const d = setMinutes(setHours(draft.occurred_at ? parseISO(draft.occurred_at) : baseDate, h), 0);
    setDraft({ ...draft, occurred_at: d.toISOString(), occurred_at_precision: 'part_of_day' });
  };
  const currentMoment = draft.occurred_at ? parseISO(draft.occurred_at).getHours() : null;
  const momentSel = (h: number) => currentMoment !== null && Math.abs(currentMoment - h) <= 1;

  return (
    <BottomSheet
      open={!!event}
      onClose={onClose}
      title="Corregir"
      description="Cambia lo que no esté bien. Lo demás queda igual."
      footer={
        <>
          <Button fullWidth label="Guardar cambio" onPress={() => onSave({ ...draft, confidence: 1 })} />
          {onRemove ? (
            <Button fullWidth variant="ghost" label="Quitar este registro" onPress={onRemove} />
          ) : (
            <Button fullWidth variant="ghost" label="Cancelar" onPress={onClose} />
          )}
        </>
      }
    >
      <View style={{ gap: space[5] }}>
        {(draft.type === 'symptom' || draft.type === 'food' || draft.type === 'drink' || draft.type === 'medication' || draft.type === 'activity') && (
          <TextField
            label="¿Qué fue?"
            multiline={false}
            value={draft.data.name}
            onChangeText={(name) => setDraft({ ...draft, data: { ...draft.data, name } } as ExtractedEvent)}
          />
        )}

        {draft.type === 'symptom' && (
          <IntensitySlider
            value={draft.data.intensity_0_10 ?? 5}
            inferred={draft.data.intensity_inferred}
            onChange={(v) => setDraft({ ...draft, data: { ...draft.data, intensity_0_10: v, intensity_inferred: false } })}
          />
        )}

        {draft.type === 'medication' && (
          <ChipGroup label="¿Te alivió?">
            {RELIEF.map((r) => (
              <Chip key={r.v} label={r.label} selected={draft.data.relief === r.v} onPress={() => setDraft({ ...draft, data: { ...draft.data, relief: r.v } })} />
            ))}
          </ChipGroup>
        )}

        {draft.type === 'sleep' && (
          <ChipGroup label="¿Cuántas horas dormiste?">
            {[4, 5, 6, 7, 8, 9].map((h) => (
              <Chip key={h} label={`${h} h`} selected={Math.round(draft.data.hours) === h} onPress={() => setDraft({ ...draft, data: { ...draft.data, hours: h } })} />
            ))}
          </ChipGroup>
        )}

        {(draft.type === 'stress' || draft.type === 'mood') && (
          <IntensitySlider
            label={draft.type === 'stress' ? '¿Cuánto estrés?' : '¿Cómo está tu ánimo? (10 = muy bien)'}
            value={draft.data.level_0_10}
            onChange={(v) => setDraft({ ...draft, data: { level_0_10: v } })}
          />
        )}

        {draft.type === 'water' && (
          <ChipGroup label="¿Cuántos vasos de agua?">
            {[2, 4, 6, 8].map((g) => (
              <Chip key={g} label={`${g}`} selected={draft.data.glasses === g} onPress={() => setDraft({ ...draft, data: { glasses: g } })} />
            ))}
          </ChipGroup>
        )}

        {draft.type !== 'sleep' && (
          <ChipGroup label="¿Cuándo fue?">
            {MOMENTS.map((m) => (
              <Chip key={m.label} label={m.label} selected={momentSel(m.h)} onPress={() => setMoment(m.h)} />
            ))}
          </ChipGroup>
        )}

        <KText variant="small" tone="muted">
          Lo que dijiste: “{draft.source_text}”
        </KText>
      </View>
    </BottomSheet>
  );
}
