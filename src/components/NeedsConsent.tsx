import { View } from 'react-native';
import { router } from 'expo-router';
import { Button, EmptyState } from '@/components/ui';
import { closeModal } from '@/lib/nav';
import { useKalma } from '@/lib/store';

/** true si se puede registrar (los dos consentimientos obligatorios están activos). */
export function useCanRecord() {
  const consent = useKalma((s) => s.consent);
  return consent.health && consent.ai;
}

/** Estado "registrar está en pausa" cuando la persona revocó un consentimiento obligatorio. */
export function NeedsConsent() {
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <EmptyState
        kind="locked"
        title="Registrar está en pausa"
        description="Desactivaste el permiso para guardar datos de salud o para entender lo que dices. Lo que ya guardaste sigue aquí."
        actions={
          <>
            <Button fullWidth label="Revisar mis permisos" onPress={() => { closeModal(); router.push('/ajustes/privacidad'); }} />
            <Button fullWidth variant="ghost" label="Cerrar" onPress={closeModal} />
          </>
        }
      />
    </View>
  );
}
