import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { CalendarDay } from '../CalendarDay';
import { EventCard } from '../EventCard';
import { KText } from '../KText';
import { Mascot } from '../Mascot';
import { PatternCard } from '../PatternCard';
import { ProgressRing } from '../ProgressRing';

/** Tarjetas de evento, días del calendario, patrones, progreso y mascota. */
const meta = { title: 'Componentes/Datos' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const EventCardNormal: Story = {
  render: () => (
    <EventCard type="symptom" title="Dolor de cabeza" time="2:30 p. m." detail="Después del almuerzo · aprox." intensity={7} confidence={0.9}
      sourceText="me dolió la cabeza fuerte después del almuerzo" onEdit={fn()} onRemove={fn()} />
  ),
};
export const EventCardBajaConfianza: Story = {
  render: () => <EventCard type="food" title="Algo con queso" detail="Almuerzo" confidence={0.4} sourceText="comí algo con queso creo" onEdit={fn()} onRemove={fn()} />,
};
export const EventCardEditada: Story = {
  render: () => <EventCard type="medication" title="Acetaminofén (Dolex)" time="2:45 p. m." edited onEdit={fn()} />,
};
export const EventCardSeleccionada: Story = {
  render: () => <EventCard type="sleep" title="5 h de sueño" detail="Calidad 2 de 5" selected onPress={fn()} />,
};
export const EventCardPorTipo: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <EventCard type="drink" title="Tinto" time="10:00 a. m." detail="2 tazas · cafeína" />
      <EventCard type="food" title="Bandeja paisa" time="1:00 p. m." detail="Almuerzo · frito" />
      <EventCard type="stress" title="Estrés alto" detail="Cierre de mes" />
      <EventCard type="bowel" title="Molestia digestiva" time="3:10 p. m." intensity={4} />
      <EventCard type="water" title="4 vasos de agua" />
      <EventCard type="mood" title="Ánimo bajo" />
    </View>
  ),
};

export const CalendarDays: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {([
        [10, undefined, 'Sin síntomas'], [11, 2, 'Leve'], [12, 5, 'Moderado'], [13, 8, 'Fuerte'], [14, 10, 'Muy fuerte'], [15, null, 'Sin registro'],
      ] as const).map(([d, i, label]) => (
        <View key={d} style={{ width: 64, alignItems: 'center', gap: 4 }}>
          <View style={{ width: 48 }}><CalendarDay day={d} fullDate={`${d} de octubre`} maxIntensity={i} /></View>
          <KText variant="caption" tone="muted" center>{label}</KText>
        </View>
      ))}
      <View style={{ width: 64, alignItems: 'center', gap: 4 }}>
        <View style={{ width: 48 }}><CalendarDay day={17} fullDate="17 de octubre" isToday maxIntensity={3} /></View>
        <KText variant="caption" tone="muted">Hoy</KText>
      </View>
      <View style={{ width: 64, alignItems: 'center', gap: 4 }}>
        <View style={{ width: 48 }}><CalendarDay day={16} fullDate="16 de octubre" selected maxIntensity={6} /></View>
        <KText variant="caption" tone="muted">Seleccionado</KText>
      </View>
    </View>
  ),
};

export const PatternCards: Story = {
  render: () => (
    <View style={{ gap: 12 }}>
      <PatternCard level="strong" isNew statement="El 70 % de tus dolores de cabeza llegaron después de noches de menos de 6 horas." evidence="14 de 20 episodios · 45 días" onPress={fn()} />
      <PatternCard level="probable" statement="La molestia digestiva apareció más seguido en las 6 horas después de comer lácteos." evidence="8 de 11 episodios · 45 días" onPress={fn()} />
      <PatternCard level="possible" statement="Los días con más de 3 tintos tuviste dolor de cabeza un poco más seguido." evidence="6 de 20 episodios · 45 días" onPress={fn()} />
      <PatternCard level="possible" dismissed statement="Los días con ejercicio registraste un poco menos de dolor." evidence="4 de 20 episodios" />
    </View>
  ),
};

export const ProgressRings: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      <ProgressRing value={6} max={14} label="6 de 14 días para tu primer análisis" />
      <ProgressRing value={14} max={14} label="Análisis listo" />
      <ProgressRing value={9} max={21} size={110} label="Día 9 de 21 del experimento">
        <KText variant="smallStrong" center>Día 9{'\n'}<KText variant="caption" tone="muted">de 21</KText></KText>
      </ProgressRing>
    </View>
  ),
};

export const Mascota: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
      {(['idle', 'listening', 'thinking', 'happy', 'sleepy'] as const).map((m) => (
        <View key={m} style={{ alignItems: 'center', gap: 4 }}>
          <Mascot mood={m} size={80} />
          <KText variant="caption" tone="muted">{m}</KText>
        </View>
      ))}
    </View>
  ),
};
