import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { AudioWave } from '../AudioWave';
import { KText } from '../KText';
import { Mascot } from '../Mascot';
import { MicButton, type MicState } from '../MicButton';

/** Un toque para empezar y otro para terminar (no "mantener presionado"). Háptica al iniciar y detener. */
const meta = {
  title: 'Componentes/MicButton',
  component: MicButton,
  args: { onPress: fn(), state: 'idle', size: 'hero', level: 0 },
  argTypes: {
    state: { control: 'select', options: ['idle', 'listening', 'processing', 'blocked', 'unavailable'] },
    size: { control: 'select', options: ['nav', 'hero'] },
    level: { control: { type: 'range', min: 0, max: 1, step: 0.1 } },
  },
} satisfies Meta<typeof MicButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Reposo: Story = {};
export const Escuchando: Story = { args: { state: 'listening', level: 0.6 } };
export const Procesando: Story = { args: { state: 'processing' } };
export const PermisoDenegado: Story = { args: { state: 'blocked' } };
export const VozNoDisponible: Story = { args: { state: 'unavailable' } };
export const EnLaBarra: Story = { args: { size: 'nav' } };

function Interactive() {
  const [state, setState] = useState<MicState>('idle');
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (state !== 'listening') return;
    const id = setInterval(() => setLevel(Math.random() * 0.9 + 0.1), 120);
    return () => clearInterval(id);
  }, [state]);
  const live = state === 'listening' ? level : 0;
  return (
    <View style={{ alignItems: 'center', gap: 16 }}>
      <Mascot mood={state === 'listening' ? 'listening' : state === 'processing' ? 'thinking' : 'idle'} />
      <KText variant="heading" accessibilityLiveRegion="polite">
        {state === 'listening' ? 'Te escucho…' : state === 'processing' ? 'Kalma está entendiendo…' : 'Toca para hablar'}
      </KText>
      <AudioWave level={live} active={state === 'listening'} />
      <MicButton
        state={state}
        level={live}
        onPress={() => {
          if (state === 'listening') {
            setState('processing');
            setTimeout(() => setState('idle'), 1500);
          } else setState('listening');
        }}
      />
    </View>
  );
}

export const Interactivo: Story = { render: () => <Interactive /> };
