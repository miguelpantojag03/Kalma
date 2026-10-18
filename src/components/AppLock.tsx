import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Button, KText, Mascot } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { unlock, useDeviceSettings } from '@/lib/deviceSettings';
import { space, useTheme } from '@/theme';

/** Tiempo en segundo plano tras el cual se vuelve a pedir el desbloqueo. */
const RELOCK_AFTER_MS = 60_000;

/**
 * Bloqueo con huella/Face ID (opcional, en Privacidad y seguridad). Cubre la app al abrirla y al
 * volver después de 1 minuto en segundo plano: los datos de salud no quedan a la vista de cualquiera
 * que tome el celular. Si falla la huella, el sistema ofrece el PIN del celular.
 */
export function AppLock() {
  const { c } = useTheme();
  const { status } = useAuth();
  const enabled = useDeviceSettings((s) => s.biometricLock);
  const [locked, setLocked] = useState(enabled);
  const backgroundAt = useRef<number | null>(null);

  const tryUnlock = useCallback(async () => {
    if (await unlock()) setLocked(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') backgroundAt.current = Date.now();
      if (st === 'active' && backgroundAt.current && Date.now() - backgroundAt.current > RELOCK_AFTER_MS) setLocked(true);
    });
    return () => sub.remove();
  }, [enabled]);

  // Al bloquearse, se pide la huella de inmediato
  useEffect(() => {
    if (!enabled || !locked || status === 'loading') return;
    let alive = true;
    void unlock().then((ok) => {
      if (ok && alive) setLocked(false);
    });
    return () => {
      alive = false;
    };
  }, [enabled, locked, status]);

  if (!enabled || !locked || status === 'signedOut') return null;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: space[4], padding: space[6] }]} accessibilityViewIsModal>
      <Mascot mood="sleepy" size={130} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Lock size={22} color={c.text} />
        <KText variant="title">Kalma está bloqueada</KText>
      </View>
      <KText tone="muted" center>Usa tu huella, tu rostro o el PIN de tu celular para ver tus registros.</KText>
      <Button size="lg" label="Desbloquear" onPress={tryUnlock} />
    </View>
  );
}
