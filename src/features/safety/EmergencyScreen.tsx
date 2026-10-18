import { useEffect } from 'react';
import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Heart, MessageCircle, Phone, PhoneCall } from 'lucide-react-native';
import { Button, Card, KText } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { haptic } from '@/lib/haptics';
import { closeModal } from '@/lib/nav';
import { EMERGENCY_NUMBER, MENTAL_HEALTH_LINES, type Helpline } from '@/mocks/helplines';
import { radius, space, touch, useTheme } from '@/theme';

/**
 * Pantalla de seguridad. Interrumpe cualquier flujo ante una bandera roja.
 * - Calmada y clara: una idea por línea, sin íconos de alarma, sin mascota ni gamificación.
 * - Física: botón grande que abre el marcador con el 123.
 * - Salud mental: mensaje empático, líneas de ayuda (desde configuración verificada) y la opción
 *   de escribirle a alguien de confianza.
 * - Solo se sale con "Ya estoy bien / fue un error" (sin gesto de descarte, D23).
 */
export function EmergencyScreen() {
  const { tipo } = useLocalSearchParams<{ tipo?: 'physical' | 'mental' }>();
  const mental = tipo === 'mental';

  useEffect(() => {
    haptic.warning();
  }, []);

  const call = (n: string) => Linking.openURL(`tel:${n}`).catch(() => {});

  return (
    <Screen scroll edges={['top', 'bottom']}>
      {mental ? <MentalHealth call={call} /> : <Physical />}

      <View style={{ gap: space[2], marginTop: space[4] }}>
        {!mental && (
          <Button
            variant="danger"
            size="lg"
            fullWidth
            label={`Llamar al ${EMERGENCY_NUMBER}`}
            accessibilityHint="Abre el teléfono con el número de emergencias"
            icon={(c) => <Phone size={24} color={c} />}
            onPress={() => call(EMERGENCY_NUMBER)}
          />
        )}
        <Button variant="ghost" fullWidth label="Ya estoy bien / fue un error" onPress={() => closeModal()} />
      </View>
    </Screen>
  );
}

function Physical() {
  return (
    <View style={{ gap: space[4], paddingTop: space[7] }}>
      <KText variant="title">Esto puede necesitar atención médica urgente</KText>
      <KText>Busca atención de inmediato o llama a la línea de emergencias {EMERGENCY_NUMBER}.</KText>
      <KText tone="muted">Si hay alguien cerca, pídele que te acompañe.</KText>
    </View>
  );
}

function MentalHealth({ call }: { call: (n: string) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space[4], paddingTop: space[6] }}>
      <View style={[styles.heart, { backgroundColor: c.accent }]}>
        <Heart size={32} color={c.text} />
      </View>
      <KText variant="title">Gracias por contármelo</KText>
      <KText>Lo que sientes importa. No tienes que pasar por esto sin compañía: hablar con alguien puede ayudar ahora mismo.</KText>

      <KText variant="subheading" style={{ marginTop: space[2] }}>Puedes llamar a</KText>
      {MENTAL_HEALTH_LINES.map((h) => (
        <HelplineRow key={h.id} line={h} onCall={() => call(h.dial)} />
      ))}

      <Button
        variant="secondary"
        fullWidth
        label="Escribirle a alguien de confianza"
        icon={(col) => <MessageCircle size={20} color={col} />}
        onPress={() =>
          Share.share({ message: 'Hola, no me siento bien y me ayudaría hablar contigo. ¿Me puedes llamar?' }).catch(() => {})
        }
      />

      <Card tone="outline" style={{ gap: space[2] }}>
        <KText variant="bodyStrong">Si estás en peligro inmediato</KText>
        <Button variant="danger" fullWidth label={`Llamar al ${EMERGENCY_NUMBER}`} icon={(col) => <Phone size={20} color={col} />} onPress={() => call(EMERGENCY_NUMBER)} />
      </Card>
    </View>
  );
}

function HelplineRow({ line, onCall }: { line: Helpline; onCall: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Llamar a ${line.name}. ${line.description} ${line.coverage}, ${line.hours}. ${line.instructions ?? ''}`}
      onPress={onCall}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceMuted : c.surface, borderColor: c.border }]}
    >
      <View style={[styles.callIcon, { backgroundColor: c.primaryStrong }]}>
        <PhoneCall size={20} color={c.onPrimary} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <KText variant="bodyStrong">{line.name}</KText>
        <KText variant="small" tone="muted">{line.description}</KText>
        <KText variant="small" tone="muted">{line.coverage} · {line.hours}{line.instructions ? ` · ${line.instructions}` : ''}</KText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heart: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4], borderRadius: radius.md, borderWidth: 2, minHeight: touch.min },
  callIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
