import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, BottomSheet, Button, Checkbox, KText, PasswordField, PasswordRequirements, TextField } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { authMessage, type FriendlyAuthError } from '@/lib/authErrors';
import { useOnline } from '@/lib/session';
import { emailError, isValidEmail, isValidName, isValidPassword, nameError, passwordError } from '@/lib/validation';
import { space } from '@/theme';
import { LegalSheetContent } from './LegalSheetContent';

type Field = 'name' | 'email' | 'password';

/**
 * Crear cuenta. Validación al SALIR de cada campo (D52), contraseña con Mostrar en vez de
 * "confirmar contraseña" (D51), botón deshabilitado hasta que todo sea válido y sin doble envío.
 */
export function SignUpScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signUp } = useAuth();
  const online = useOnline();

  const [name, setName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: !!params.email, password: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyAuthError | null>(null);
  const [legal, setLegal] = useState<'terms' | 'privacy' | null>(null);
  const sending = useRef(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const blur = (f: Field) => setTouched((t) => ({ ...t, [f]: true }));

  const valid = isValidName(name) && isValidEmail(email) && isValidPassword(password) && terms;

  const submit = async () => {
    if (!valid || sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    const r = await signUp(name, email, password);
    sending.current = false;
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (r.needsConfirmation) router.replace({ pathname: '/revisa-tu-correo', params: { email: email.trim() } });
    // Si no hace falta confirmar, AuthProvider recibe la sesión y lleva al onboarding.
  };

  return (
    <Screen keyboard edges={['top', 'bottom']}>
      <View style={{ paddingTop: space[5], gap: space[2] }}>
        <KText variant="title">Creemos tu espacio en Kalma</KText>
        <KText tone="muted">Tus registros quedan en tu cuenta y solo tú los ves.</KText>
      </View>

      {!online && <Banner tone="offline" title="Estás sin conexión" message={authMessage('offline')} />}
      {error && (
        <Banner
          tone="error"
          title={error.message}
          actions={error.kind === 'email-taken' ? <Button label="Iniciar sesión" onPress={() => router.replace({ pathname: '/iniciar-sesion', params: { email } })} /> : undefined}
        />
      )}

      <TextField
        label="¿Cómo quieres que Kalma te llame?"
        multiline={false}
        placeholder="Ej.: Laura"
        value={name}
        onChangeText={setName}
        onBlur={() => blur('name')}
        error={touched.name ? nameError(name) : undefined}
        textContentType="name"
        autoComplete="name"
        autoCapitalize="words"
        returnKeyType="next"
        onSubmitEditing={() => emailRef.current?.focus()}
        submitBehavior="submit"
      />
      <TextField
        ref={emailRef}
        label="Correo"
        multiline={false}
        placeholder="tu@correo.com"
        value={email}
        onChangeText={setEmail}
        onBlur={() => blur('email')}
        error={touched.email ? emailError(email) : undefined}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
        submitBehavior="submit"
      />
      <View style={{ gap: space[3] }}>
        <PasswordField
          ref={passwordRef}
          purpose="new"
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          onBlur={() => blur('password')}
          error={touched.password ? passwordError(password) : undefined}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
        />
        <PasswordRequirements password={password} />
      </View>

      <Checkbox
        checked={terms}
        onChange={setTerms}
        requirement="required"
        label="Acepto los términos y la política de privacidad"
        description={
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3] }}>
            <Link label="Leer los términos" onPress={() => setLegal('terms')} />
            <Link label="Leer la política de privacidad" onPress={() => setLegal('privacy')} />
          </View>
        }
      />

      <Button fullWidth size="lg" label="Crear mi cuenta" loading={busy} loadingLabel="Creando tu cuenta…" disabled={!valid || !online} onPress={submit} />
      {!valid && (
        <KText variant="small" tone="muted" center>Completa los campos y acepta los términos para continuar.</KText>
      )}

      <Button fullWidth variant="ghost" label="¿Ya tienes cuenta? Inicia sesión" onPress={() => router.replace('/iniciar-sesion')} />

      <BottomSheet open={legal !== null} onClose={() => setLegal(null)} title={legal === 'privacy' ? 'Política de privacidad' : 'Términos de uso'}>
        <LegalSheetContent kind={legal ?? 'terms'} />
      </BottomSheet>
    </Screen>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center' }}>
      <KText variant="smallStrong" tone="brand" style={{ textDecorationLine: 'underline' }}>{label}</KText>
    </Pressable>
  );
}
