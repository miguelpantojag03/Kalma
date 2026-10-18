import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, EmptyState, KText, PasswordField, PasswordRequirements, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { FriendlyAuthError } from '@/lib/authErrors';
import { isValidPassword, passwordError } from '@/lib/validation';
import { space } from '@/theme';

/** Nueva contraseña (se llega desde el enlace del correo de recuperación). */
export function NewPasswordScreen() {
  const { updatePassword, status, recovering } = useAuth();
  const showToast = useToast((s) => s.show);
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const sending = useRef(false);

  // Sin la sesión temporal del enlace (venció o se abrió en otro dispositivo), no se puede cambiar.
  if (status !== 'signedIn' && !recovering) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            kind="error"
            title="Este enlace ya no sirve"
            description="Puede que haya vencido o que lo hayas abierto en otro celular. Pide uno nuevo y ábrelo aquí."
            actions={<Button fullWidth label="Pedir un enlace nuevo" onPress={() => router.replace('/olvide-contrasena')} />}
          />
        </View>
      </Screen>
    );
  }

  const save = async () => {
    if (!isValidPassword(password) || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const r = await updatePassword(password);
    sending.current = false;
    setBusy(false);
    if (!r.ok) return setError(r.error);
    showToast({ message: 'Listo, cambiamos tu contraseña' });
    // AuthProvider deja de estar en recuperación y lleva a la app.
  };

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <View style={{ paddingTop: space[5], gap: space[2] }}>
        <KText variant="title">Crea una contraseña nueva</KText>
        <KText tone="muted">Con ella vas a entrar de ahora en adelante.</KText>
      </View>
      {error && <Banner tone="error" title={error.message} />}
      <View style={{ gap: space[3] }}>
        <PasswordField
          purpose="new"
          label="Contraseña nueva"
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched(true)}
          error={touched ? passwordError(password) : undefined}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
        <PasswordRequirements password={password} />
      </View>
      <Button fullWidth size="lg" label="Guardar contraseña" loading={busy} loadingLabel="Guardando…" disabled={!isValidPassword(password)} onPress={save} />
    </Screen>
  );
}
