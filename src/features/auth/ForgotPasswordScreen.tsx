import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, KText, Mascot, TextField } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { authMessage, type FriendlyAuthError } from '@/lib/authErrors';
import { useOnline } from '@/lib/session';
import { emailError, isValidEmail } from '@/lib/validation';
import { space } from '@/theme';
import { useCountdown } from './useCountdown';

/**
 * Olvidé mi contraseña. La confirmación dice lo mismo exista o no la cuenta (no revela qué correos
 * están registrados). El enlace abre la app en "Nueva contraseña".
 */
export function ForgotPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { requestPasswordReset } = useAuth();
  const online = useOnline();
  const [email, setEmail] = useState(params.email ?? '');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const sending = useRef(false);
  const { left, ready, restart } = useCountdown(60);

  const send = async () => {
    if (!isValidEmail(email) || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const r = await requestPasswordReset(email);
    sending.current = false;
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setSent(true);
    restart();
  };

  if (sent) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
          <Mascot mood="happy" size={140} />
          <KText variant="title" center>Revisa tu correo</KText>
          <KText center>Si hay una cuenta con {email.trim()}, te llegará un enlace para crear una contraseña nueva.</KText>
          <KText tone="muted" center>Ábrelo desde este celular. Si no lo ves, revisa spam o promociones.</KText>
        </View>
        <View style={{ gap: space[2], paddingBottom: space[2] }}>
          {error && <Banner tone="error" title={error.message} />}
          <Button fullWidth variant="secondary" label={ready ? 'Enviar otra vez' : `Enviar otra vez en ${left} s`} disabled={!ready} loading={busy} onPress={send} />
          <Button fullWidth variant="ghost" label="Volver a iniciar sesión" onPress={() => router.replace({ pathname: '/iniciar-sesion', params: { email } })} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <View style={{ paddingTop: space[5], gap: space[2] }}>
        <KText variant="title">¿Olvidaste tu contraseña?</KText>
        <KText tone="muted">Escribe tu correo y te enviamos un enlace para crear una nueva.</KText>
      </View>
      {!online && <Banner tone="offline" title="Estás sin conexión" message={authMessage('offline')} />}
      {error && <Banner tone="error" title={error.message} />}
      <TextField
        label="Correo"
        multiline={false}
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setTouched(true)}
        error={touched ? emailError(email) : undefined}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="send"
        onSubmitEditing={() => void send()}
      />
      <Button fullWidth size="lg" label="Enviar enlace" loading={busy} loadingLabel="Enviando…" disabled={!isValidEmail(email) || !online} onPress={send} />
      <Button fullWidth variant="ghost" label="Volver" onPress={() => router.back()} />
    </Screen>
  );
}
