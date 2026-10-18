/**
 * Mensaje del día. Reglas de tono (iguales al resto de Kalma):
 * - Sin culpa ni rachas ("no rompas tu racha"), sin promesas de salud ("esto te curará").
 * - Frases cortas, tuteo, español de Colombia. Nada de consejos médicos.
 * - Si ayer hubo un síntoma fuerte, el mensaje es de cuidado, no de "¡vamos con toda!".
 * El mensaje cambia una vez al día y es el mismo todo ese día (no cambia al abrir la app).
 */
import { dayKey } from './dates';

export type MessageMood = 'general' | 'care' | 'progress';

export interface DailyMessage {
  text: string;
  mood: MessageMood;
}

const GENERAL = [
  'Hoy no tienes que hacerlo perfecto. Con anotar lo que puedas, ya estás cuidándote.',
  'Conocerte toma tiempo. Cada registro es una pista más.',
  'Tu cuerpo te habla todos los días. Escucharlo también es avanzar.',
  'Un vaso de agua, una pausa, una respiración profunda: lo pequeño también cuenta.',
  'Lo que anotas hoy le ayuda a tu yo de la próxima consulta.',
  'No hay días buenos o malos para registrar. Todos sirven.',
  'Darte un momento para ti no es un lujo, es parte de cuidarte.',
  'Si hoy te sientes bien, anótalo también: los días buenos enseñan tanto como los difíciles.',
  'Vas a tu ritmo, y está bien.',
  'Cuidarte es una forma de quererte. Hoy también cuenta.',
  'Respira. Lo que no alcances a anotar hoy, lo puedes contar mañana.',
  'Entender qué te pasa es un camino, no una carrera.',
  'Hoy puede ser un buen día para almorzar con calma.',
  'Tómate un minuto para estirarte. Tu espalda te lo agradece.',
  'Lo que sientes es real e importante. Gracias por contárselo a Kalma.',
  'Una cosa a la vez. Así también se avanza.',
  'Hoy intenta notar algo que te haga sentir bien, aunque sea pequeño.',
  'Tú conoces tu cuerpo mejor que nadie. Kalma solo te ayuda a ordenarlo.',
  'Dormir bien también es una tarea importante del día.',
  'Hablar de lo que sientes, con tu médico o con alguien de confianza, ayuda.',
];

const CARE = [
  'Ayer fue un día pesado. Hoy, si puedes, ve con calma.',
  'Después de un día difícil, descansar también es avanzar.',
  'Si hoy todavía te sientes mal, está bien bajar el ritmo.',
  'Ayer anotaste un síntoma fuerte. Escúchate hoy y no te exijas de más.',
  'Los días difíciles pasan. Aquí queda todo anotado para tu médico.',
];

const PROGRESS = [
  'Llevas varios días registrando. Esa constancia es la que encuentra patrones.',
  'Ya tienes suficientes datos para ver patrones. Échales un vistazo cuando quieras.',
  'Tus registros ya cuentan una historia. Es buena para llevar a tu consulta.',
];

/** Número estable a partir de la fecha (el mismo día da el mismo mensaje). */
function daySeed(key: string) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

export interface MessageContext {
  /** Intensidad máxima de un síntoma de ayer (null si no hubo). */
  yesterdayMaxIntensity: number | null;
  /** Días registrados (para el mensaje de progreso). */
  recordedDays: number;
}

export function dailyMessage(ctx: MessageContext, date = new Date()): DailyMessage {
  const seed = daySeed(dayKey(date));
  if (ctx.yesterdayMaxIntensity !== null && ctx.yesterdayMaxIntensity >= 7) {
    return { text: CARE[seed % CARE.length]!, mood: 'care' };
  }
  // Uno de cada cinco días, si ya hay datos suficientes, se reconoce la constancia (sin rachas)
  if (ctx.recordedDays >= 14 && seed % 5 === 0) {
    return { text: PROGRESS[Math.floor(seed / 5) % PROGRESS.length]!, mood: 'progress' };
  }
  // Se divide entre 5 para que la elección no dependa de la regla de arriba (si no, 4 frases nunca salían)
  return { text: GENERAL[Math.floor(seed / 5) % GENERAL.length]!, mood: 'general' };
}

/** Para la notificación de la mañana (sin contexto: solo mensajes generales). */
export function generalMessageFor(date: Date): string {
  // Misma frase que la tarjeta de Hoy ese día (cuando no es un día de cuidado ni de constancia)
  return GENERAL[Math.floor(daySeed(dayKey(date)) / 5) % GENERAL.length]!;
}

export const MESSAGE_COUNT = { general: GENERAL.length, care: CARE.length, progress: PROGRESS.length };
