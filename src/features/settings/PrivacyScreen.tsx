import { useEffect, useState } from 'react';
import { Switch, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Download, FingerprintPattern as Fingerprint, Trash } from 'lucide-react-native';
import { Banner, BottomSheet, Button, Card, Checkbox, KText, ListRow, TextField, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { biometricAvailability, unlock, useDeviceSettings, type BiometricAvailability } from '@/lib/deviceSettings';
import { shortDate } from '@/lib/dates';
import { shareExport } from '@/lib/exportData';
import { cancelAllReminders, scheduleDailyCheckin } from '@/lib/notifications';
import { useKalma } from '@/lib/store';
import { space, useTheme } from '@/theme';

type ConsentKey = 'health' | 'ai' | 'location';
const CONSENTS: { key: ConsentKey; label: string; description: string; required: boolean }[] = [
  { key: 'health', label: 'Guardar mis datos de salud', description: 'Sin esto no puedo guardar registros nuevos.', required: true },
  { key: 'ai', label: 'Entender lo que digo con IA', description: 'Sin esto no puedo convertir tu voz o texto en registros. Solo el texto que dictas (sin tu nombre) va a Google Gemini; en su versión gratuita, Google puede usarlo para mejorar sus productos.', required: true },
  { key: 'location', label: 'Usar mi ubicación aproximada', description: 'La app funciona igual sin esto.', required: false },
];

/** Privacidad y seguridad: consentimientos (ver/revocar), bloqueo, exportar y borrar (Ley 1581). */
export function PrivacyScreen() {
  const { c } = useTheme();
  const { status, user } = useAuth();
  const { consent, setConsent, profile, entries, experiments, wipeAll, resetDemo } = useKalma();
  const { biometricLock, setBiometricLock, checkinReminder } = useDeviceSettings();
  const showToast = useToast((s) => s.show);
  const [bio, setBio] = useState<BiometricAvailability>('unsupported');
  const [revoking, setRevoking] = useState<ConsentKey | null>(null);
  const [wipe, setWipe] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    void biometricAvailability().then(setBio);
  }, []);

  const toggleConsent = (key: ConsentKey, value: boolean) => {
    if (!value && CONSENTS.find((x) => x.key === key)!.required) return setRevoking(key);
    setConsent(key, value);
    showToast({ message: value ? 'Listo, lo activé' : 'Listo, lo desactivé', tone: 'info' });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Privacidad y seguridad' }} />
      <Screen edges={[]} keyboard>
        <View style={{ height: space[3] }} />
        <KText variant="heading">Lo que aceptaste</KText>
        <KText variant="small" tone="muted">Puedes cambiarlo cuando quieras. Guardamos la fecha de cada cambio.</KText>
        {CONSENTS.map((x) => (
          <Checkbox
            key={x.key}
            checked={consent[x.key]}
            onChange={(v) => toggleConsent(x.key, v)}
            requirement={x.required ? 'required' : 'optional'}
            label={x.label}
            description={`${x.description}${consent.updatedAt[x.key] ? ` Último cambio: ${shortDate(consent.updatedAt[x.key]!)}.` : ''}`}
          />
        ))}
        {(!consent.health || !consent.ai) && (
          <Banner tone="warning" title="Registrar está en pausa" message="Activa los dos permisos obligatorios para volver a registrar. Lo que ya guardaste sigue aquí." />
        )}

        <KText variant="heading" style={{ marginTop: space[3] }}>Seguridad</KText>
        <Card>
          <ListRow
            icon={Fingerprint}
            label="Bloquear con huella o Face ID"
            description={bio === 'ok' ? 'Kalma te pide desbloquear al abrirla.' : bio === 'not-enrolled' ? 'Primero configura tu huella o rostro en el celular.' : 'Este dispositivo no lo permite.'}
            trailing={
              <Switch
                accessibilityLabel="Bloquear con huella o Face ID"
                value={biometricLock}
                disabled={bio !== 'ok'}
                onValueChange={async (v) => {
                  // Se pide desbloquear para activarlo o desactivarlo (evita que otra persona lo cambie)
                  if (await unlock(v ? 'Confirma para activar el bloqueo' : 'Confirma para quitar el bloqueo')) {
                    setBiometricLock(v);
                    showToast({ message: v ? 'Listo: Kalma pedirá tu huella o rostro' : 'Quité el bloqueo', tone: 'info' });
                  }
                }}
                trackColor={{ true: c.primaryStrong, false: c.borderStrong }}
                thumbColor={c.surface}
              />
            }
          />
        </Card>

        <KText variant="heading" style={{ marginTop: space[3] }}>Tus datos</KText>
        <Card style={{ gap: space[1] }}>
          <ListRow
            icon={Download}
            label="Exportar mis datos"
            description="Un archivo con todos tus registros, para guardarlo o llevarlo a otro lugar."
            onPress={async () => { if (!(await shareExport({ profile, consent, entries, experiments }, user?.email ?? null))) showToast({ message: 'Exportar funciona en el celular', tone: 'info' }); }}
          />
          <ListRow icon={Trash} label={status === 'demo' ? 'Borrar los datos de la demo' : 'Borrar todos mis registros'} description="Tu cuenta se mantiene. No se puede deshacer." onPress={() => setWipe(true)} />
          {status === 'signedIn' && (
            <ListRow label="Eliminar mi cuenta y todos mis datos" description="Está en Perfil › Cuenta." onPress={() => router.back()} />
          )}
        </Card>

        <BottomSheet
          open={revoking !== null}
          onClose={() => setRevoking(null)}
          variant="dialog"
          title="¿Desactivar este permiso?"
          description="Mientras esté desactivado no podrás registrar nada nuevo. Lo que ya guardaste no se borra; si quieres borrarlo, usa «Borrar todos mis registros»."
          footer={
            <>
              <Button fullWidth label="Mantenerlo activo" onPress={() => setRevoking(null)} />
              <Button fullWidth variant="ghost" label="Sí, desactivar" onPress={() => { if (revoking) setConsent(revoking, false); setRevoking(null); }} />
            </>
          }
        />

        <BottomSheet
          open={wipe}
          onClose={() => { setWipe(false); setConfirmText(''); }}
          variant="dialog"
          title="¿Borrar todos tus registros?"
          description="Se borran tus registros, patrones, experimentos y visitas. Tu cuenta se mantiene. No se puede deshacer."
          footer={
            <>
              <Button fullWidth label="No, conservarlos" onPress={() => { setWipe(false); setConfirmText(''); }} />
              <Button
                fullWidth
                variant="ghost"
                label="Borrar definitivamente"
                disabled={confirmText.trim().toUpperCase() !== 'BORRAR'}
                onPress={() => {
                  if (status === 'demo') resetDemo();
                  else {
                    // Se conservan perfil y consentimientos; se vacía lo demás (y se sincroniza el borrado)
                    const { profile: p, consent: cs } = useKalma.getState();
                    wipeAll();
                    useKalma.setState({ profile: p, consent: cs });
                  }
                  // Los recordatorios de experimentos y controles borrados dejan de llegar; el check-in sigue
                  void cancelAllReminders().then(() => checkinReminder && scheduleDailyCheckin(profile.reminderTime, profile.name || undefined));
                  setWipe(false);
                  setConfirmText('');
                  showToast({ message: status === 'demo' ? 'Listo, la demo volvió a empezar' : 'Listo, borré tus registros', tone: 'info' });
                }}
              />
            </>
          }
        >
          <TextField label="Para confirmar, escribe BORRAR" multiline={false} value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} placeholder="BORRAR" />
        </BottomSheet>
      </Screen>
    </>
  );
}
