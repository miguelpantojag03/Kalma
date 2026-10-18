import { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { Coffee } from 'lucide-react-native';
import { Chip, ChipGroup } from '../Chip';
import { IntensityBadge, IntensitySlider } from '../Intensity';
import { TextField } from '../TextField';

/** Chips (radio / checkbox), slider de intensidad "adjustable" y campo de texto alternativo a la voz. */
const meta = { title: 'Componentes/Entradas' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function SingleChoice() {
  const [v, setV] = useState<string | null>(null);
  return (
    <ChipGroup label="¿Te alivió el acetaminofén?">
      {['Sí, del todo', 'Un poco', 'No', 'Todavía no sé'].map((o) => (
        <Chip key={o} label={o} selected={v === o} onPress={() => setV(o)} />
      ))}
    </ChipGroup>
  );
}

function MultiChoice() {
  const [v, setV] = useState<string[]>(['Pantallas']);
  return (
    <ChipGroup label="¿Qué crees que influyó? (varias)" mode="multiple">
      {['Pantallas', 'Estrés', 'Poco sueño', 'Tinto', 'Saltarme comidas'].map((o) => (
        <Chip
          key={o}
          mode="multiple"
          label={o}
          selected={v.includes(o)}
          onPress={() => setV((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))}
        />
      ))}
    </ChipGroup>
  );
}

function Slider({ inferred, disabled }: { inferred?: boolean; disabled?: boolean }) {
  const [v, setV] = useState(7);
  return <IntensitySlider value={v} onChange={setV} inferred={inferred} disabled={disabled} />;
}

export const ChipSeleccionSimple: Story = { render: () => <SingleChoice /> };
export const ChipSeleccionMultiple: Story = { render: () => <MultiChoice /> };
export const ChipEstados: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Chip label="Default" />
      <Chip label="Seleccionado" selected />
      <Chip label="Tinto" icon={(c) => <Coffee size={16} color={c} />} />
      <Chip label="Filtro compacto" compact />
      <Chip label="Deshabilitado" disabled />
    </View>
  ),
};
export const IntensidadSlider: Story = { render: () => <Slider /> };
export const IntensidadInferida: Story = { render: () => <Slider inferred /> };
export const IntensidadDeshabilitada: Story = { render: () => <Slider disabled /> };
export const IntensidadBadges: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Array.from({ length: 11 }, (_, i) => <IntensityBadge key={i} value={i} />)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[0, 3, 5, 7, 10].map((i) => <IntensityBadge key={i} value={i} showWord />)}
      </View>
    </View>
  ),
};
export const CampoDeTexto: Story = {
  render: () => (
    <TextField label="Escríbelo como lo dirías" hint="Ej.: almorcé bandeja paisa y a las 3 me dolió la cabeza" placeholder="Cuéntame…" />
  ),
};
export const CampoDeTextoConError: Story = {
  render: () => (
    <TextField label="Escríbelo como lo dirías" defaultValue="asdf" error="No alcancé a entender. ¿Me cuentas qué sentiste o qué comiste?" />
  ),
};
