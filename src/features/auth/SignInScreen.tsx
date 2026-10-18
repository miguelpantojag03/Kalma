import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, KText, PasswordField, TextField, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { authMessage, type FriendlyAuthError } from '@/lib/authErrors';
import { useOnline } from '@/lib/session';
import { emailError, isValidEmail } from '@/lib/validation';
import { space } from '@/theme';

/**
 * Iniciar sesión. Error genérico y amable si fallan las credenciales (D53): no revela si el correo
 * tiene cuenta. Si el correo no está confirmado, se ofrece reenviar el enlace.
 */
export function SignInScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn, resendConfirmation, linkError, clearLinkError } = useAuth();
  const online = useOnline();
  const showToast = useToast((s) => s.show);

  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const sending = useRef(false);
  const passwordRef = useRef<TextInputInstance>(null);

  const valid = isValidEmail(email) && password.length > 0;

  const submit = async () => {
    if (!valid || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const r = await signIn(email, password);
    sending.current = false;
    setBusy(false);
    if (!r.ok) setError(r.error);
    // Con éxito, AuthProvider abre la cuenta y redirige.
  };

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <View style={{ paddingTop: space[5], gap: space[2] }}>
        <KText variant="title">¡Qué bueno verte de nuevo!</KText>
        <KText tone="muted">Entra con tu correo y tu contraseña.</KText>
      </View>

      {!online && <Banner tone="offline" title="Estás sin conexión" message={authMessage('offline')} />}
      {linkError && <Banner tone="error" title={linkError.message} onDismiss={clearLinkError} />}
      {error && (
        <Banner
          tone="error"
          title={error.message}
          actions={
            error.kind === 'email-not-confirmed' ? (
              <Button
                label="Reenviar el enlace"
                onPress={async () => {
                  const r = await resendConfirmation(email);
                  if (r.ok) showToast({ message: 'Te enviamos un enlace nuevo a tu correo', tone: 'info' });
                  else setError(r.error);
                }}
              />
            ) : undefined
          }
        />
      )}

      <TextField
        label="Correo"
        multiline={false}
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        onBlur={() => setEmailTouched(true)}
        error={emailTouched ? emailError(email) : undefined}
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <PasswordField
        ref={passwordRef}
        purpose="current"
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
      />
      <Button variant="ghost" label="¿Olvidaste tu contraseña?" onPress={() => router.push({ pathname: '/olvide-contrasena', params: { email } })} />

      <Button fullWidth size="lg" label="Iniciar sesión" loading={busy} loadingLabel="Entrando…" disabled={!valid || !online} onPress={submit} />
      <Button fullWidth variant="ghost" label="¿No tienes cuenta? Crea una" onPress={() => router.replace('/crear-cuenta')} />
    </Screen>
  );
}
