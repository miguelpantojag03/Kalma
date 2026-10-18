import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, KText, Mascot, useToast } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { FriendlyAuthError } from '@/lib/authErrors';
import { space } from '@/theme';
import { useCountdown } from './useCountdown';

/** "Revisa tu correo" después de crear la cuenta (cuando la confirmación de correo está activa). */
export function CheckEmailScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const { resendConfirmation } = useAuth();
  const showToast = useToast((s) => s.show);
  const { left, ready, restart } = useCountdown(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<FriendlyAuthError | null>(null);

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
        <Mascot mood="happy" size={140} />
        <KText variant="title" center>Te enviamos un enlace a tu correo</KText>
        <KText center>
          Ábrelo desde este celular para confirmar tu cuenta{email ? ':' : '.'}
        </KText>
        {!!email && <KText variant="bodyStrong" center>{email}</KText>}
        <KText tone="muted" center>Si no lo ves en unos minutos, revisa la carpeta de spam o promociones.</KText>
      </View>
      <View style={{ gap: space[2], paddingBottom: space[2] }}>
        {error && <Banner tone="error" title={error.message} />}
        <Button
          fullWidth
          variant="secondary"
          label={ready ? 'Reenviar el enlace' : `Reenviar en ${left} s`}
          disabled={!ready || !email}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            const r = await resendConfirmation(email);
            setBusy(false);
            if (!r.ok) return setError(r.error);
            restart();
            showToast({ message: 'Listo, te enviamos un enlace nuevo', tone: 'info' });
          }}
        />
        <Button fullWidth variant="ghost" label="Cambiar el correo" onPress={() => router.replace({ pathname: '/crear-cuenta', params: { email } })} />
        <Button fullWidth variant="ghost" label="Ya lo confirmé, iniciar sesión" onPress={() => router.replace({ pathname: '/iniciar-sesion', params: { email } })} />
      </View>
    </Screen>
  );
}
