import { Linking, StyleSheet, View } from 'react-native';
import { Bell, Camera, Check, Mic, type LucideIcon } from 'lucide-react-native';
import { radius, space, useTheme } from '@/theme';
import { Button } from './Button';
import { KText } from './KText';

export type PermissionKind = 'microphone' | 'notifications' | 'camera';
export type PermissionStatus = 'undetermined' | 'denied';

const COPY: Record<PermissionKind, { icon: LucideIcon; title: string; why: string; points: string[]; allow: string; alt: string }> = {
  microphone: {
    icon: Mic,
    title: 'Para escucharte, necesito el micrófono',
    why: 'Kalma usa el micrófono solo mientras le hablas, para entender cómo te sientes.',
    points: ['Solo graba cuando tocas el botón', 'No guardo el audio, solo lo que entendí', 'Siempre puedes escribirlo'],
    allow: 'Permitir micrófono',
    alt: 'Prefiero escribir',
  },
  notifications: {
    icon: Bell,
    title: '¿Te recuerdo en la noche?',
    why: 'Un aviso al día para el check-in de 30 segundos. Nada más.',
    points: ['Uno al día, a la hora que elijas', 'Lo cambias o apagas en Ajustes', 'Sin mensajes de culpa'],
    allow: 'Permitir recordatorios',
    alt: 'Ahora no',
  },
  camera: {
    icon: Camera,
    title: 'Una foto vale más que mil palabras',
    why: 'Toma una foto de tu plato o de la caja del medicamento y yo la anoto.',
    points: ['Solo cuando tú abres la cámara', 'Puedes revisar lo que entendí'],
    allow: 'Permitir cámara',
    alt: 'Ahora no',
  },
};

export interface PermissionPromptProps {
  kind: PermissionKind;
  status?: PermissionStatus;
  onAllow: () => void;
  /** Alternativa que mantiene la app funcionando (escribir, saltar…). Nunca bloquea. */
  onAlternative: () => void;
}

/**
 * Pantalla previa al diálogo del sistema: explica el beneficio ANTES de pedir el permiso.
 * Si ya se negó, ofrece ir a Ajustes del sistema y una alternativa que no bloquea.
 */
export function PermissionPrompt({ kind, status = 'undetermined', onAllow, onAlternative }: PermissionPromptProps) {
  const { c } = useTheme();
  const k = COPY[kind];
  const Icon = k.icon;
  const denied = status === 'denied';

  return (
    <View style={styles.wrap}>
      <View style={[styles.icon, { backgroundColor: c.accent }]}>
        <Icon size={40} color={c.text} />
      </View>
      <KText variant="title" center>{denied ? 'El permiso está apagado' : k.title}</KText>
      <KText tone="muted" center>
        {denied ? 'No pasa nada: puedes activarlo en los Ajustes del celular cuando quieras, o seguir sin él.' : k.why}
      </KText>
      {!denied && (
        <View style={styles.points} accessibilityRole="list">
          {k.points.map((p) => (
            <View key={p} style={styles.point}>
              <Check size={18} strokeWidth={3} color={c.primaryStrong} />
              <KText style={{ flex: 1 }}>{p}</KText>
            </View>
          ))}
        </View>
      )}
      <View style={styles.actions}>
        <Button
          fullWidth
          size="lg"
          label={denied ? 'Abrir Ajustes del celular' : k.allow}
          onPress={denied ? () => Linking.openSettings() : onAllow}
        />
        <Button fullWidth variant="ghost" label={k.alt} onPress={onAlternative} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space[4], padding: space[5] },
  icon: { width: 88, height: 88, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  points: { alignSelf: 'stretch', gap: space[3], marginVertical: space[2] },
  point: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  actions: { alignSelf: 'stretch', gap: space[2], marginTop: space[2] },
});
