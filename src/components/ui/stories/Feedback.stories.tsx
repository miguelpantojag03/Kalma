import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-native';
import { fn } from 'storybook/test';
import { BottomSheet } from '../BottomSheet';
import { Button } from '../Button';
import { Card } from '../Card';
import { Chip, ChipGroup } from '../Chip';
import { EmptyState } from '../EmptyState';
import { Banner } from '../Feedback';
import { PermissionPrompt } from '../PermissionPrompt';
import { ProgressRing } from '../ProgressRing';

/** Hojas, avisos, estados vacíos y permisos con contexto. Los errores de la app son ámbar; el rojo es solo emergencia. */
const meta = { title: 'Componentes/Feedback' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function SheetDemo() {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<string | null>(null);
  return (
    <>
      <Button fullWidth label="Abrir pregunta de seguimiento" onPress={() => setOpen(true)} />
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="¿Te alivió el dolex?"
        description="Así sé si te sirvió. Puedes saltarlo."
        footer={
          <>
            <Button fullWidth label="Listo" disabled={!v} onPress={() => setOpen(false)} />
            <Button fullWidth variant="ghost" label="Saltar" onPress={() => setOpen(false)} />
          </>
        }
      >
        <ChipGroup label="Alivio" hideLabel>
          {['Sí, del todo', 'Un poco', 'No', 'Todavía no sé'].map((o) => (
            <Chip key={o} label={o} selected={v === o} onPress={() => setV(o)} />
          ))}
        </ChipGroup>
      </BottomSheet>
    </>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button fullWidth variant="secondary" label="Borrar todos mis datos" onPress={() => setOpen(true)} />
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        variant="dialog"
        dismissible={false}
        title="¿Borrar todo?"
        description="Se borrarán tus registros, patrones y reportes. No se puede deshacer."
        footer={
          <>
            <Button fullWidth label="No, conservar mis datos" onPress={() => setOpen(false)} />
            <Button fullWidth variant="ghost" label="Sí, borrar todo" onPress={() => setOpen(false)} />
          </>
        }
      />
    </>
  );
}

export const HojaInferior: Story = { render: () => <SheetDemo /> };
export const DialogoDeConfirmacion: Story = { render: () => <DialogDemo /> };

export const Banners: Story = {
  render: () => (
    <>
      <Banner tone="reminder" title="Hora del check-in" message="Tres preguntas rápidas sobre tu día." onDismiss={fn()} actions={<Button label="Responder (30 s)" />} />
      <Banner tone="success" title="Listo, lo guardé" />
      <Banner tone="info" title="Encontré algo que te puede interesar" message="Revisa tus patrones cuando quieras." />
      <Banner tone="offline" title="Estás sin conexión" message="Puedes seguir registrando; lo proceso cuando vuelvas." />
      <Banner tone="error" title="No pude escucharte bien" message="¿Lo intentamos otra vez o prefieres escribirlo?" actions={<Button label="Intentar otra vez" />} />
      <Banner tone="warning" title="Revisa lo que entendí" message="Marqué con un punto lo que no tengo tan claro." />
    </>
  ),
};

export const EstadoVacioPrimerUso: Story = {
  render: () => (
    <Card>
      <EmptyState kind="first-use" title="Tu día está en blanco" description="Toca el micrófono y cuéntame cómo te sientes." actions={<Button fullWidth label="Hacer mi primer registro" />} />
    </Card>
  ),
};
export const EstadoVacioBloqueado: Story = {
  render: () => (
    <EmptyState
      kind="locked"
      visual={<ProgressRing value={6} max={14} size={120} label="6 de 14 días para desbloquear Patrones" />}
      title="Necesito 14 días para buscar patrones"
      description="Con menos datos podría mostrarte coincidencias que no significan nada. Vas muy bien."
    />
  ),
};
export const EstadoDeError: Story = {
  render: () => <EmptyState kind="error" title="No pude cargar tu calendario" description="Tus datos están a salvo en tu celular." actions={<Button fullWidth label="Intentar otra vez" />} />,
};
export const SinConexion: Story = {
  render: () => <EmptyState kind="offline" title="Estás sin conexión" description="Puedes seguir registrando. Lo proceso cuando vuelva la conexión." />,
};

export const PermisoMicrofono: Story = { render: () => <PermissionPrompt kind="microphone" onAllow={fn()} onAlternative={fn()} /> };
export const PermisoNegado: Story = { render: () => <PermissionPrompt kind="microphone" status="denied" onAllow={fn()} onAlternative={fn()} /> };
export const PermisoNotificaciones: Story = { render: () => <PermissionPrompt kind="notifications" onAllow={fn()} onAlternative={fn()} /> };
