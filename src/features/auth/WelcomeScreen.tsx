import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Banner, Button, KText, Mascot } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth/AuthProvider';
import { space } from '@/theme';

/**
 * Bienvenida (sin sesión). Jerarquía visual en tres niveles (D55):
 *  1. Crear cuenta — botón primario: es lo que necesita la mayoría la primera vez.
 *  2. Ya tengo cuenta — botón secundario.
 *  3. Explorar con datos de ejemplo — enlace de texto: útil para curiosear y presentar, pero no
 *     debe competir con el camino principal.
 */
export function WelcomeScreen() {
  const { configured, enterDemo, linkError, clearLinkError } = useAuth();
  const [entering, setEntering] = useState(false);

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }}>
        <Mascot mood="happy" size={170} label="Kalma, una piedra zen sonriente" />
        <KText variant="display" center>Kalma</KText>
        <KText variant="heading" center>Cuéntale a Kalma cómo te sientes. Ella encuentra el patrón.</KText>
        <KText tone="muted" center>Registra hablando en segundos y llega a tu consulta con datos claros.</KText>
      </View>

      <View style={{ gap: space[3], paddingBottom: space[2] }}>
        {linkError && (
          <Banner tone="error" title={linkError.message} onDismiss={clearLinkError} />
        )}
        {!configured && (
          <Banner
            tone="info"
            title="Las cuentas aún no están configuradas"
            message="Este prototipo todavía no tiene su proyecto de Supabase. Puedes explorar con datos de ejemplo."
          />
        )}
        <Button fullWidth size="lg" label="Crear cuenta" disabled={!configured} onPress={() => router.push('/crear-cuenta')} />
        <Button fullWidth variant="secondary" label="Ya tengo cuenta" disabled={!configured} onPress={() => router.push('/iniciar-sesion')} />
        <Button
          fullWidth
          variant="ghost"
          label="Explorar con datos de ejemplo"
          loading={entering}
          accessibilityHint="Abre Kalma con 45 días de datos inventados. Nada se guarda en una cuenta."
          onPress={async () => {
            setEntering(true);
            await enterDemo();
          }}
        />
        <KText variant="caption" tone="muted" center>
          Kalma no es un servicio médico ni de emergencias. Si es una emergencia, llama al 123.
        </KText>
      </View>
    </Screen>
  );
}
