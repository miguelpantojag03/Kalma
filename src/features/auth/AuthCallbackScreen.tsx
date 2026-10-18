import { View } from 'react-native';
import { KText, Mascot } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { space } from '@/theme';

/**
 * Destino del enlace de confirmación (kalma://auth/callback). AuthProvider procesa el enlace y
 * redirige; esta pantalla solo acompaña los segundos de espera.
 */
export function AuthCallbackScreen() {
  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space[4] }} accessibilityLiveRegion="polite">
        <Mascot mood="thinking" size={130} />
        <KText variant="heading" center>Confirmando tu correo…</KText>
      </View>
    </Screen>
  );
}
