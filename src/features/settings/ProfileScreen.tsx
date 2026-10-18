import { useState } from 'react';
import { Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Bell, Download, KeyRound, LogOut, Moon, Palette, RotateCcw, Smartphone, Sparkles, Sun, Trash, UserRound } from 'lucide-react-native';
import {
  Banner, BottomSheet, Button, Card, Chip, ChipGroup, KText, PasswordField, PasswordRequirements, PermissionPrompt, TextField, useToast,
} from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { FriendlyAuthError } from '@/lib/authErrors';
import { shareExport } from '@/lib/exportData';
import { getNotifPermission, requestNotifPermission, sendCheckinSoon } from '@/lib/notifications';
import { analysisProgress } from '@/lib/selectors';
import { useSession } from '@/lib/session';
import { useKalma } from '@/lib/store';
import { isValidName, isValidPassword, nameError, passwordError } from '@/lib/validation';
import { space, useTheme, useThemePref, type ThemePref } from '@/theme';

const THEMES: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'Como el celular', Icon: Smartphone },
  { value: 'light', label: 'Claro', Icon: Sun },
  { value: 'dark', label: 'Oscuro', Icon: Moon },
];

type Sheet = 'password' | 'logout' | 'delete' | 'resetDemo' | 'notif' | null;

/**
 * Perfil. Con cuenta: Cuenta (nombre, correo, contraseña, exportar, cerrar sesión, eliminar).
 * En demo: aviso + herramientas de demo (solo existen en modo demo). Apariencia siempre.
 * (Perfil y Ajustes completos —condiciones, médicos, cuidador, privacidad— llegan en la fase 9.)
 */
export function ProfileScreen() {
  const { status, user, updateName, updatePassword, signOut, deleteAccount, syncPending, exitDemo } = useAuth();
  const { pref, setPref } = useThemePref();
  const theme = useTheme();
  const showToast = useToast((s) => s.show);
  const { profile, entries, consent, experiments, resetDemo, outbox } = useKalma();
  const { simulateOffline, setSimulateOffline } = useSession();

  const [sheet, setSheet] = useState<Sheet>(null);
  const [notifStatus, setNotifStatus] = useState<'undetermined' | 'denied'>('undetermined');
  const [name, setName] = useState(profile.name);
  const [nameTouched, setNameTouched] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [pwTouched, setPwTouched] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const [pendingWarning, setPendingWarning] = useState(false);

  const days = analysisProgress(entries).days;
  const closeSheet = () => {
    setSheet(null);
    setError(null);
    setBusy(false);
  };

  const sendCheckin = async () => {
    const p = await getNotifPermission();
    if (p === 'unsupported') return showToast({ message: 'Las notificaciones funcionan en el celular', tone: 'info' });
    if (p !== 'granted') {
      setNotifStatus(p);
      return setSheet('notif');
    }
    await sendCheckinSoon(5, profile.name || undefined);
    showToast({ message: 'En 5 segundos llega el recordatorio. Puedes salir de la app.', tone: 'info' });
  };

  const openLogout = async () => {
    // Antes de cerrar sesión se intenta enviar lo pendiente: cerrar borra la caché local.
    const synced = outbox.length === 0 || (await syncPending());
    setPendingWarning(!synced);
    setSheet('logout');
  };

  return (
    <Screen tab title="Perfil">
      {status === 'signedIn' && (
        <Card style={{ gap: space[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
            <UserRound size={22} color={theme.c.text} />
            <KText variant="subheading">Cuenta</KText>
          </View>
          <TextField
            label="Tu nombre"
            multiline={false}
            value={name}
            onChangeText={setName}
            onBlur={() => setNameTouched(true)}
            error={nameTouched ? nameError(name) : undefined}
            textContentType="name"
            autoComplete="name"
          />
          {name.trim() !== profile.name && (
            <Button
              label="Guardar nombre"
              disabled={!isValidName(name)}
              onPress={async () => {
                await updateName(name);
                showToast({ message: 'Listo, actualicé tu nombre' });
              }}
            />
          )}
          <View style={{ gap: space[1] }}>
            <KText variant="smallStrong" tone="muted">Correo</KText>
            <KText selectable>{user?.email}</KText>
          </View>
          {outbox.length > 0 && (
            <KText variant="small" tone="muted">Tienes {outbox.length} {outbox.length === 1 ? 'cambio' : 'cambios'} por guardar en la nube; se envían solos cuando haya internet.</KText>
          )}
          <View style={{ gap: space[2] }}>
            <Button variant="secondary" fullWidth label="Cambiar contraseña" icon={(col) => <KeyRound size={20} color={col} />} onPress={() => setSheet('password')} />
            <Button
              variant="secondary"
              fullWidth
              label="Exportar mis datos"
              icon={(col) => <Download size={20} color={col} />}
              onPress={async () => {
                const ok = await shareExport({ profile, consent, entries, experiments }, user?.email ?? null);
                if (!ok) showToast({ message: 'Exportar funciona en el celular', tone: 'info' });
              }}
            />
            <Button variant="ghost" fullWidth label="Cerrar sesión" icon={(col) => <LogOut size={20} color={col} />} onPress={openLogout} />
            <Button variant="ghost" fullWidth label="Eliminar mi cuenta y todos mis datos" icon={(col) => <Trash size={20} color={col} />} onPress={() => setSheet('delete')} />
          </View>
        </Card>
      )}

      {status === 'demo' && (
        <Card style={{ gap: space[3] }}>
          <KText variant="subheading">Demo</KText>
          <KText variant="small" tone="muted">Estás viendo datos de ejemplo de Laura ({days} días). Nada de esto se guarda en una cuenta.</KText>
          <Button variant="secondary" fullWidth label="Reiniciar la demo" icon={(c) => <RotateCcw size={20} color={c} />} onPress={() => setSheet('resetDemo')} />
          <Button variant="secondary" fullWidth label="Enviar el check-in en 5 segundos" icon={(c) => <Bell size={20} color={c} />} onPress={sendCheckin} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: 48 }}>
            <KText style={{ flex: 1 }}>Simular sin conexión</KText>
            <Switch
              accessibilityLabel="Simular sin conexión"
              value={simulateOffline}
              onValueChange={setSimulateOffline}
              trackColor={{ true: theme.c.primaryStrong, false: theme.c.borderStrong }}
              thumbColor={theme.c.surface}
            />
          </View>
          <Button fullWidth label="Crear mi cuenta" icon={(c) => <Sparkles size={20} color={c} />} onPress={async () => { await exitDemo(); router.push('/crear-cuenta'); }} />
          <Button variant="ghost" fullWidth label="Salir de la demo" onPress={exitDemo} />
        </Card>
      )}

      <Card>
        <ChipGroup label="Apariencia">
          {THEMES.map(({ value, label, Icon }) => (
            <Chip key={value} label={label} selected={pref === value} onPress={() => setPref(value)} icon={(color) => <Icon size={16} color={color} />} />
          ))}
        </ChipGroup>
      </Card>

      <Button variant="ghost" fullWidth label="Ver el design system" icon={(c) => <Palette size={20} color={c} />} onPress={() => router.push('/design-system')} />

      {/* ---------- hojas ---------- */}

      <BottomSheet
        open={sheet === 'password'}
        onClose={closeSheet}
        title="Cambiar contraseña"
        footer={
          <Button
            fullWidth
            label="Guardar contraseña"
            loading={busy}
            disabled={!isValidPassword(newPassword)}
            onPress={async () => {
              setBusy(true);
              const r = await updatePassword(newPassword);
              setBusy(false);
              if (!r.ok) return setError(r.error);
              setNewPassword('');
              closeSheet();
              showToast({ message: 'Listo, cambiamos tu contraseña' });
            }}
          />
        }
      >
        {error && <Banner tone="error" title={error.message} />}
        <PasswordField purpose="new" label="Contraseña nueva" value={newPassword} onChangeText={setNewPassword} onBlur={() => setPwTouched(true)} error={pwTouched ? passwordError(newPassword) : undefined} />
        <PasswordRequirements password={newPassword} />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'logout'}
        onClose={closeSheet}
        variant="dialog"
        title="¿Cerrar sesión?"
        description={
          pendingWarning
            ? 'Tienes cambios que aún no se guardaron en la nube (no hay internet). Si cierras sesión ahora, se perderán.'
            : 'Tus datos quedan guardados en tu cuenta. En este celular se borran hasta que vuelvas a entrar.'
        }
        footer={
          <>
            <Button fullWidth label="Quedarme" onPress={closeSheet} />
            <Button
              fullWidth
              variant="ghost"
              label={pendingWarning ? 'Cerrar sesión igual' : 'Sí, cerrar sesión'}
              onPress={async () => {
                closeSheet();
                await signOut();
                showToast({ message: 'Cerraste sesión. ¡Hasta pronto!', tone: 'info' });
              }}
            />
          </>
        }
      />

      <BottomSheet
        open={sheet === 'delete'}
        onClose={closeSheet}
        variant="dialog"
        dismissible={!busy}
        title="¿Eliminar tu cuenta?"
        description="Se borran para siempre tu cuenta y todos tus registros, patrones, experimentos y reportes. No se puede deshacer."
        footer={
          <>
            <Button fullWidth label="No, conservar mi cuenta" onPress={closeSheet} />
            <Button
              fullWidth
              variant="ghost"
              label="Eliminar definitivamente"
              loading={busy}
              loadingLabel="Eliminando…"
              disabled={confirmText.trim().toUpperCase() !== 'ELIMINAR'}
              onPress={async () => {
                setBusy(true);
                const r = await deleteAccount();
                if (!r.ok) {
                  setBusy(false);
                  return setError(r.error);
                }
                closeSheet();
                setConfirmText('');
                showToast({ message: 'Eliminamos tu cuenta y todos tus datos', tone: 'info' });
              }}
            />
          </>
        }
      >
        {error && <Banner tone="error" title={error.message} />}
        <TextField
          label="Para confirmar, escribe ELIMINAR"
          multiline={false}
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ELIMINAR"
        />
      </BottomSheet>

      <BottomSheet
        open={sheet === 'resetDemo'}
        onClose={closeSheet}
        variant="dialog"
        title="¿Reiniciar la demo?"
        description="Vuelven los 45 días de ejemplo de Laura y se borra lo que agregaste en la demo."
        footer={
          <>
            <Button fullWidth label="Cancelar" onPress={closeSheet} />
            <Button fullWidth variant="ghost" label="Sí, reiniciar" onPress={() => { resetDemo(); closeSheet(); showToast({ message: 'Listo, cargué los 45 días de Laura' }); }} />
          </>
        }
      />

      <BottomSheet open={sheet === 'notif'} onClose={closeSheet} title="Recordatorios">
        <PermissionPrompt
          kind="notifications"
          status={notifStatus}
          onAllow={async () => {
            const r = await requestNotifPermission();
            closeSheet();
            if (r === 'granted') void sendCheckin();
          }}
          onAlternative={closeSheet}
        />
      </BottomSheet>
    </Screen>
  );
}
