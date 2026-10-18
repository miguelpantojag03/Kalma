import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Button, Card, KText } from '@/components/ui';
import { Screen } from '@/components/Screen';
import { EARLY_DAYS } from '@/lib/patterns';
import { DAYS_FOR_ANALYSIS } from '@/lib/selectors';
import { space, touch, useTheme } from '@/theme';

const FAQ: { q: string; a: string }[] = [
  { q: '¿Qué hace Kalma?', a: 'Te ayuda a anotar en segundos lo que comes, cómo duermes y lo que sientes, busca coincidencias entre esas cosas y arma un reporte de una página para tu médico.' },
  { q: '¿Por qué todavía no veo patrones?', a: `Con ${EARLY_DAYS} días de registros te muestro pistas tempranas: coincidencias muy marcadas que todavía pueden ser casualidad. Con ${DAYS_FOR_ANALYSIS} días ya hay datos para confirmar patrones. Antes de eso, cualquier coincidencia podría engañarte. En Hoy ves cuántos días llevas.` },
  { q: '¿Qué significan Posible, Probable y Fuerte?', a: 'Qué tan seguido se repite algo en tus datos. Posible: puede ser casualidad. Probable: se repite más de lo esperado. Fuerte: se repite mucho, con 30 días o más de registros. Ninguno es un diagnóstico.' },
  { q: '¿Kalma me dice qué tengo o qué tomar?', a: 'No. Kalma no diagnostica, no receta y nunca te pedirá dejar un medicamento. Muestra tus datos ordenados para que los converses con tu médico.' },
  { q: '¿Quién puede ver mis datos?', a: 'Solo tú. Tu cuenta está protegida y cada persona solo puede leer sus propios registros. En el modo de ejemplo nada se guarda en una cuenta. Puedes exportar o borrar todo en Perfil › Privacidad y seguridad.' },
  { q: '¿Cómo corrijo algo que anoté?', a: 'Antes de guardar, toca «Editar» en la tarjeta. Si ya lo guardaste, ve a Calendario, toca el día y edita o borra el registro.' },
  { q: '¿Kalma usa inteligencia artificial?', a: 'Sí. Para entender lo que dictas usa Google Gemini: solo se envía lo que dictas o la foto que eliges, sin tu nombre. Kalma no guarda las fotos. En la versión gratuita, Google puede usar ese contenido para mejorar sus productos. Si no hay conexión o la IA falla, Kalma entiende en tu celular con sus propias reglas, y siempre revisas antes de guardar. Las alertas de emergencia nunca dependen de la IA.' },
  { q: '¿Puedo usar Kalma sin hablar?', a: 'Sí. Puedes escribir, usar «Me empezó un síntoma» (3 toques) o el modo crisis, que no necesita hablar ni mirar mucho la pantalla.' },
  { q: '¿Qué pasa si no tengo internet?', a: 'Lo que anotas se guarda en tu celular y se sube solo cuando vuelva la conexión.' },
  { q: '¿Cómo funciona Mi ciclo?', a: 'Es opcional: lo activas en Perfil › Mi salud. Con tus periodos anotados, Kalma estima el próximo y cuenta si tus síntomas aparecen cerca de él. Es una estimación: no sirve como método anticonceptivo.' },
  { q: '¿De dónde salen los consejos de comida?', a: 'Son ideas generales de bienestar y, cuando hay datos, coincidencias de tus propios registros. No son un plan de alimentación: para cambios grandes, habla con tu médico o un nutricionista.' },
  { q: '¿Qué hago en una emergencia?', a: 'Llama al 123. Si escribes o dices algo que suene urgente, Kalma te mostrará cómo pedir ayuda de inmediato.' },
];

/** Ayuda: preguntas frecuentes en acordeón (cierra la heurística 10 de la autoevaluación). */
export function HelpScreen() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Ayuda' }} />
      <Screen edges={[]}>
        <View style={{ height: space[3] }} />
        <KText variant="heading" accessibilityRole="header">Preguntas frecuentes</KText>
        <Card style={{ gap: space[1] }}>
          {FAQ.map((f, i) => <Item key={f.q} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />)}
        </Card>
        <Button variant="secondary" fullWidth label="Ir a Privacidad y seguridad" onPress={() => router.push('/ajustes/privacidad')} />
      </Screen>
    </>
  );
}

function Item({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: touch.min + 8, paddingVertical: space[2] }}
      >
        <KText variant="bodyStrong" style={{ flex: 1 }}>{q}</KText>
        {open ? <ChevronUp size={20} color={c.muted} /> : <ChevronDown size={20} color={c.muted} />}
      </Pressable>
      {open && <KText variant="small" style={{ paddingBottom: space[3] }}>{a}</KText>}
    </View>
  );
}
