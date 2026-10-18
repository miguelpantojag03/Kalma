import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { Mic, Phone } from 'lucide-react-native';
import { Button } from '../Button';

/**
 * Acción principal. Radio completo, alto mínimo 48. primary usa primaryStrong (5.16:1) porque
 * primary no pasa AA con texto blanco. danger existe SOLO para la pantalla de emergencia.
 */
const meta = {
  title: 'Componentes/Button',
  component: Button,
  args: { label: 'Guardar', onPress: fn(), fullWidth: true },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['md', 'lg'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primario: Story = {};
export const Secundario: Story = { args: { variant: 'secondary', label: 'Prefiero escribirlo' } };
export const Fantasma: Story = { args: { variant: 'ghost', label: 'Ahora no' } };
export const ConIcono: Story = { args: { label: 'Grabar otra vez', icon: (c) => <Mic size={20} color={c} /> } };
export const Cargando: Story = { args: { loading: true, loadingLabel: 'Guardando…' } };
export const Deshabilitado: Story = { args: { disabled: true } };
export const Emergencia: Story = {
  args: { variant: 'danger', size: 'lg', label: 'Llamar al 123', icon: (c) => <Phone size={24} color={c} /> },
};
