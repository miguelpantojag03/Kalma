import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { BottomSheet, Button, Chip, ChipGroup, IntensitySlider, useToast } from '@/components/ui';
import { detectRedFlags } from '@/lib/redFlags';
import { useKalma } from '@/lib/store';
import { space } from '@/theme';

const COMMON = ['Dolor de cabeza', 'Molestia digestiva', 'Náuseas', 'Mareo', 'Acidez'] as const;

/**
 * "Me empezó un síntoma": registrar sin hablar, en 3 toques (síntoma · intensidad · guardar).
 * Pensado para el momento de la crisis: con migraña, hablar o mirar mucho la pantalla molesta.
 * La hora es "ahora" (lo más preciso posible para el análisis de patrones).
 */
export function QuickSymptomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addEntry = useKalma((s) => s.addEntry);
  const removeEntry = useKalma((s) => s.removeEntry);
  const conditions = useKalma((s) => s.profile.conditions);
  const showToast = useToast((s) => s.show);
  const [name, setName] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(5);

  // Primero lo que la persona dijo que quiere entender (ley de Hick: lo más probable, arriba)
  const relevant = (o: string) =>
    (o === 'Dolor de cabeza' && conditions.some((c) => /migra|cabeza/i.test(c))) ||
    (o !== 'Dolor de cabeza' && conditions.some((c) => /digest|colon|estómago/i.test(c)));
  const options = [...COMMON].sort((a, b) => Number(relevant(b)) - Number(relevant(a)));

  const save = () => {
    if (!name) return;
    const now = new Date().toISOString();
    const text = `Me empezó ${name.toLowerCase()}, intensidad ${intensity}`;
    if (detectRedFlags(text).detected) {
      router.push({ pathname: '/emergencia', params: { tipo: 'physical' } });
      return;
    }
    const entry = addEntry({
      transcript: text,
      summary: `${name} ${intensity}/10.`,
      source: 'text',
      events: [{
        type: 'symptom', occurred_at: now, occurred_at_precision: 'exact', confidence: 1, source_text: text,
        data: { name: name.toLowerCase(), body_location: null, side: null, intensity_0_10: intensity, intensity_inferred: false, character: null, duration_minutes: null },
      }],
    });
    onClose();
    setName(null);
    setIntensity(5);
    showToast({ message: 'Listo, lo guardé', actionLabel: 'Deshacer', onAction: () => removeEntry(entry.id) });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="¿Qué te empezó?"
      description="Lo anoto con la hora de ahora. Después puedes agregar detalles."
      footer={
        <>
          <Button fullWidth size="lg" label="Guardar" disabled={!name} onPress={save} />
          <Button fullWidth variant="ghost" label="Prefiero contarlo" onPress={() => { onClose(); router.push({ pathname: '/registro', params: { auto: '1' } }); }} />
        </>
      }
    >
      <View style={{ gap: space[5] }}>
        <ChipGroup label="Síntoma" hideLabel>
          {options.map((o) => (
            <Chip key={o} label={o} selected={name === o} onPress={() => setName(o)} />
          ))}
        </ChipGroup>
        <IntensitySlider value={intensity} onChange={setIntensity} disabled={!name} />
      </View>
    </BottomSheet>
  );
}
