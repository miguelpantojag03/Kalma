import { useState } from 'react';
import { View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { Checkbox } from '../Checkbox';
import { PasswordField, PasswordRequirements } from '../PasswordField';
import { TextField } from '../TextField';

/**
 * Formularios de cuenta. TextField: default · foco (toca el campo) · error · deshabilitado.
 * PasswordField: Mostrar/Ocultar en vez de "confirmar contraseña". PasswordRequirements: lista que se
 * va marcando. Checkbox: nunca premarcada, con "obligatorio/opcional" escrito.
 */
const meta = { title: 'Componentes/Formularios de cuenta' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const CampoDefault: Story = {
  render: () => <TextField label="Correo" multiline={false} placeholder="tu@correo.com" keyboardType="email-address" autoCapitalize="none" />,
};
export const CampoConError: Story = {
  render: () => <TextField label="Correo" multiline={false} defaultValue="andres@gmail" error="Revisa el correo: parece que le falta algo (por ejemplo, la @ o el .com)." />,
};
export const CampoDeshabilitado: Story = {
  render: () => <TextField label="Correo" multiline={false} defaultValue="laura@kalma.app" editable={false} />,
};

function PasswordDemo() {
  const [pw, setPw] = useState('');
  return (
    <View style={{ gap: 12 }}>
      <PasswordField purpose="new" label="Contraseña" value={pw} onChangeText={setPw} />
      <PasswordRequirements password={pw} />
    </View>
  );
}
export const ContrasenaConRequisitos: Story = { render: () => <PasswordDemo /> };
export const RequisitosCumplidos: Story = { render: () => <PasswordRequirements password="tintico2026" /> };
export const ContrasenaConError: Story = {
  render: () => <PasswordField purpose="new" label="Contraseña" defaultValue="tinto" error="Tu contraseña aún no cumple los requisitos de abajo." />,
};

function CheckboxDemo() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  return (
    <View style={{ gap: 12 }}>
      <Checkbox checked={a} onChange={setA} requirement="required" label="Guardar mis datos de salud" description="Síntomas, comidas, sueño y medicamentos." />
      <Checkbox checked={b} onChange={setB} requirement="optional" label="Usar mi ubicación aproximada" description="La app funciona igual sin esto." />
    </View>
  );
}
export const Casillas: Story = { render: () => <CheckboxDemo /> };
