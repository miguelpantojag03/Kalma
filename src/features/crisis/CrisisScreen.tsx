import { useEffect, useMemo, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCanRecord } from '@/components/NeedsConsent';
import { closeModal } from '@/lib/nav';
import type { StoredEvent } from '@/lib/schema';
import { useKalma } from '@/lib/store';

/**
 * Modo crisis (para una migraña en curso). Diseñado para alguien con dolor y sensibilidad a la luz:
 * - Pantalla casi negra en cualquier tema, texto grande, sin animaciones ni vibración.
 * - Dos decisiones en todo el flujo: qué tan fuerte (un toque empieza) y "ya pasó" (calcula la duración).
 * - Si se cierra la app, al volver se retoma el episodio abierto.
 * Colores fijos con contraste ≥ 7:1 sobre el fondo (WCAG AAA para texto).
 */
const C = { bg: '#0B0F10', text: '#C9D6D2', muted: '#93A7A1', button: '#1A2523', border: '#3A4D48' };
const LEVELS = [
  { label: 'Molesto', value: 5 },
  { label: 'Fuerte', value: 7 },
  { label: 'Muy fuerte', value: 9 },
];
const CRISIS_SOURCE = 'modo crisis';

type SymptomEvent = Extract<StoredEvent, { type: 'symptom' }>;

export function CrisisScreen() {
  const entries = useKalma((s) => s.entries);
  const addEntry = useKalma((s) => s.addEntry);
  const updateEvent = useKalma((s) => s.updateEvent);
  const canRecord = useCanRecord();
  const [now, setNow] = useState(() => Date.now());

  // Episodio abierto en las últimas 24 h (empezó en modo crisis y aún no tiene duración)
  const open = useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      for (const e of entries[i]!.events) {
        if (e.type === 'symptom' && e.source_text === CRISIS_SOURCE && e.data.duration_minutes == null && e.occurred_at && now - Date.parse(e.occurred_at) < 86_400_000) return e as SymptomEvent;
      }
    }
    return null;
  }, [entries, now]);

  // El tiempo transcurrido se actualiza cada minuto (sin animación)
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [open]);

  const start = (intensity: number) => {
    const at = new Date().toISOString();
    addEntry({
      transcript: 'Empezó un dolor de cabeza (modo crisis)',
      summary: `Dolor de cabeza ${intensity}/10.`,
      source: 'text',
      events: [{
        type: 'symptom', occurred_at: at, occurred_at_precision: 'exact', confidence: 1, source_text: CRISIS_SOURCE,
        data: { name: 'dolor de cabeza', body_location: null, side: null, intensity_0_10: intensity, intensity_inferred: false, character: null, duration_minutes: null },
      }],
    });
  };

  const finish = () => {
    if (!open?.occurred_at) return;
    const minutes = Math.max(1, Math.round((Date.now() - Date.parse(open.occurred_at)) / 60_000));
    updateEvent(open.id, { data: { ...open.data, duration_minutes: minutes } });
    closeModal();
  };

  const elapsed = open?.occurred_at ? Math.max(0, Math.round((now - Date.parse(open.occurred_at)) / 60_000)) : 0;
  const elapsedText = elapsed < 60 ? `${elapsed} min` : `${Math.floor(elapsed / 60)} h ${elapsed % 60} min`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.wrap}>
        <Pressable accessibilityRole="button" onPress={closeModal} hitSlop={12} style={styles.close}>
          <Text style={styles.small}>Cerrar</Text>
        </Pressable>

        {!canRecord ? (
          <View style={styles.center}>
            <Text style={styles.title}>Registrar está en pausa</Text>
            <Text style={styles.body}>Activa los permisos en Perfil › Privacidad y seguridad para anotar desde aquí.</Text>
          </View>
        ) : open ? (
          <View style={styles.center}>
            <Text style={styles.title} accessibilityRole="header">Empezó hace {elapsedText}</Text>
            <Text style={styles.body}>Si puedes, busca un lugar oscuro y silencioso. Kalma ya lo anotó.</Text>
            <Big label="Ya pasó" onPress={finish} hint="Guarda cuánto duró" />
            <Text style={[styles.small, { textAlign: 'center' }]}>Si tomaste algo, cuéntaselo a Kalma después.</Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Text style={styles.title} accessibilityRole="header">¿Qué tan fuerte es?</Text>
            <Text style={styles.body}>Un toque y Kalma lo anota con la hora de ahora.</Text>
            {LEVELS.map((l) => <Big key={l.value} label={l.label} onPress={() => start(l.value)} hint={`Intensidad ${l.value} de 10`} />)}
          </View>
        )}

        <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/emergencia', params: { tipo: 'physical' } })} hitSlop={8} style={styles.emergency}>
          <Text style={styles.small}>¿Es el peor dolor de tu vida o algo distinto a lo de siempre? Toca aquí.</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Big({ label, onPress, hint }: { label: string; onPress: () => void; hint: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityHint={hint} onPress={onPress} style={({ pressed }) => [styles.big, pressed && { borderColor: C.text }]}>
      <Text style={styles.bigText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24 },
  close: { alignSelf: 'flex-end', minHeight: 48, justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', gap: 20 },
  title: { color: C.text, fontSize: 30, fontFamily: 'Nunito_800ExtraBold', lineHeight: 38 },
  body: { color: C.muted, fontSize: 18, lineHeight: 26, fontFamily: 'Inter_400Regular' },
  small: { color: C.muted, fontSize: 16, lineHeight: 22, fontFamily: 'Inter_400Regular' },
  big: { minHeight: 72, borderRadius: 20, borderWidth: 2, borderColor: C.border, backgroundColor: C.button, alignItems: 'center', justifyContent: 'center' },
  bigText: { color: C.text, fontSize: 22, fontFamily: 'Nunito_700Bold' },
  emergency: { minHeight: 48, justifyContent: 'center' },
});
