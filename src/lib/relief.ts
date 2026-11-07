/**
 * Ideas para sentirse mejor mientras llega la cita con el médico (D90).
 *
 * Reglas de seguridad (no se negocian):
 * - Solo medidas generales de alivio y comodidad. NUNCA medicamentos, dosis, suplementos, remedios
 *   ni causas ("eso te pasa por…"). Kalma no diagnostica ni receta.
 * - El texto de cada idea está escrito y revisado aquí. La IA NO redacta consejos: solo ELIGE ideas
 *   de esta lista (por id). Lo que no está en la lista se descarta.
 * - Cada tipo de síntoma trae "cuándo buscar atención". Las banderas rojas siguen detectándose
 *   antes, en el celular, y abren la pantalla de emergencia sin esperar a nada.
 */
import type { Entry, StoredEvent } from './schema';

export type SymptomKind = 'headache' | 'digestive' | 'acidity' | 'nausea' | 'dizziness' | 'cramps' | 'general';

export interface ReliefIdea {
  id: string;
  title: string;
  text: string;
  kinds: SymptomKind[];
}

/** Catálogo revisado. Si agregas una idea: sin medicamentos, sin dosis, sin "cura", en tuteo. */
export const RELIEF_IDEAS: ReliefIdea[] = [
  { id: 'oscuro', kinds: ['headache'], title: 'Descansar a oscuras y en silencio', text: 'Bajar la luz y el ruido suele ayudar durante un dolor de cabeza. Si puedes, recuéstate 20 o 30 minutos.' },
  { id: 'frio-frente', kinds: ['headache'], title: 'Algo frío en la frente o la nuca', text: 'Un pañito húmedo frío o una compresa fría envuelta en tela, por ratos de unos 15 minutos. Nunca hielo directo sobre la piel.' },
  { id: 'pantallas', kinds: ['headache'], title: 'Un descanso de las pantallas', text: 'El brillo del celular o del computador puede molestar más. Baja el brillo o déjalo a un lado un rato.' },
  { id: 'agua', kinds: ['headache', 'digestive', 'dizziness', 'general'], title: 'Agua a sorbos', text: 'Tomar agua poco a poco, sin afanes. Mucha de una vez puede caer pesada.' },
  { id: 'comer-algo', kinds: ['headache', 'dizziness'], title: 'Comer algo sencillo', text: 'Si llevas varias horas sin comer, algo liviano (una fruta, una galleta, una arepa sola) puede ayudarte.' },
  { id: 'respirar', kinds: ['headache', 'digestive', 'nausea', 'cramps', 'general'], title: 'Respirar despacio', text: 'Toma aire en 4 tiempos y suéltalo en 6, durante 2 o 3 minutos. Ayuda a soltar la tensión del cuello y del abdomen.' },
  { id: 'cuello', kinds: ['headache'], title: 'Soltar los hombros y el cuello', text: 'Gira los hombros despacio hacia atrás y deja caer la cabeza a cada lado, sin forzar. Si duele más, para.' },
  { id: 'liviano', kinds: ['digestive', 'acidity', 'nausea'], title: 'Comidas suaves y en poca cantidad', text: 'Por unas horas, mejor porciones pequeñas y evitar lo frito, lo muy grasoso o lo muy condimentado.' },
  { id: 'ropa', kinds: ['digestive', 'acidity', 'cramps'], title: 'Ropa suelta en la cintura', text: 'Aflojar el pantalón o la correa quita presión del abdomen.' },
  { id: 'tibio', kinds: ['digestive', 'cramps'], title: 'Algo tibio sobre el abdomen', text: 'Una bolsa de agua tibia (no caliente) envuelta en una toalla, por ratos. Revisa que no te queme la piel.' },
  { id: 'caminar', kinds: ['digestive', 'cramps'], title: 'Caminar suave unos minutos', text: 'Una caminata tranquila de 10 minutos ayuda a muchas personas cuando se sienten inflamadas o con cólico.' },
  { id: 'no-acostarse', kinds: ['acidity'], title: 'No acostarte enseguida después de comer', text: 'Esperar 2 o 3 horas antes de acostarte ayuda con la acidez. Si necesitas descansar, hazlo sentado.' },
  { id: 'cabecera', kinds: ['acidity'], title: 'Levantar la cabecera', text: 'Dormir con la cabeza y el pecho un poco más altos (una almohada extra bajo el colchón) ayuda en la noche.' },
  { id: 'sorbos', kinds: ['nausea'], title: 'Líquidos en sorbos pequeños', text: 'Agua o suero en sorbos pequeños y seguidos, en vez de un vaso entero de una vez.' },
  { id: 'aire', kinds: ['nausea', 'dizziness'], title: 'Aire fresco', text: 'Abrir una ventana o salir un momento a un lugar ventilado suele aliviar las náuseas y el mareo.' },
  { id: 'quieto', kinds: ['nausea'], title: 'Quedarte quieto un rato', text: 'Sentado o recostado con la cabeza un poco alta. Moverte mucho puede aumentar las náuseas.' },
  { id: 'seco', kinds: ['nausea'], title: 'Algo seco si te provoca', text: 'Unas galletas de soda o pan tostado, de a poquito. No te obligues a comer si no quieres.' },
  { id: 'sentarse', kinds: ['dizziness'], title: 'Sentarte o acostarte ya', text: 'Lo primero es evitar una caída: siéntate o acuéstate hasta que pase.' },
  { id: 'levantarse', kinds: ['dizziness'], title: 'Levantarte despacio', text: 'Primero siéntate un momento en el borde de la cama o la silla, y luego te paras.' },
  { id: 'descanso', kinds: ['cramps', 'general'], title: 'Darte un descanso', text: 'Si puedes, haz una pausa en lo que estás haciendo y descansa un rato en una posición cómoda.' },
];

/** Señales para buscar atención. Lo urgente va primero y con el 123. */
export const SEEK_CARE: Record<SymptomKind, { urgent: string; soon: string }> = {
  headache: {
    urgent: 'Si es el peor dolor de tu vida o empezó de golpe, si viene con fiebre y cuello rígido, confusión, debilidad o adormecimiento de un lado, dificultad para hablar, o después de un golpe en la cabeza.',
    soon: 'Si tus dolores son cada vez más seguidos, si cambian de como suelen ser, o si estás tomando algo para el dolor muchos días a la semana.',
  },
  digestive: {
    urgent: 'Si el dolor es muy fuerte y empezó de repente, si vomitas sangre, si tus heces son negras o con sangre, o si tienes fiebre alta.',
    soon: 'Si las molestias duran más de unos días, si estás bajando de peso sin querer o si te despiertan en la noche.',
  },
  acidity: {
    urgent: 'Si sientes dolor o presión en el pecho, dificultad para tragar o vómito con sangre.',
    soon: 'Si la acidez es casi diaria, si te cuesta tragar o si no mejora en un par de semanas.',
  },
  nausea: {
    urgent: 'Si vomitas sangre, si no puedes retener ni líquidos, o si te sientes muy débil, confundido o casi no orinas.',
    soon: 'Si las náuseas duran más de un par de días o vuelven seguido.',
  },
  dizziness: {
    urgent: 'Si viene con dolor en el pecho, desmayo, debilidad de un lado del cuerpo, dificultad para hablar o visión doble.',
    soon: 'Si los mareos se repiten o te han hecho caer.',
  },
  cramps: {
    urgent: 'Si el dolor es muy fuerte y distinto a lo usual, si hay sangrado muy abundante o fiebre, o si podrías estar en embarazo.',
    soon: 'Si los cólicos no te dejan hacer tus cosas o son cada vez más fuertes.',
  },
  general: {
    urgent: 'Si el malestar es muy fuerte, empeora rápido o viene con dificultad para respirar, dolor en el pecho o desmayo.',
    soon: 'Si no mejora en unos días o te preocupa.',
  },
};

export const KIND_LABEL: Record<SymptomKind, string> = {
  headache: 'tu dolor de cabeza',
  digestive: 'tu molestia digestiva',
  acidity: 'la acidez',
  nausea: 'las náuseas',
  dizziness: 'el mareo',
  cramps: 'el cólico',
  general: 'cómo te sientes',
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** A qué grupo pertenece un síntoma, por su nombre y su zona. */
export function symptomKind(name: string, bodyLocation?: string | null): SymptomKind {
  const t = norm(`${name} ${bodyLocation ?? ''}`);
  if (/menstrua|periodo|regla/.test(t) || (/colico/.test(t) && !/estomag|abdom|barriga|intestin/.test(t))) return 'cramps';
  if (/acidez|agrieras|reflujo|ardor/.test(t)) return 'acidity';
  if (/nausea|vomit|ganas de vomitar|asco/.test(t)) return 'nausea';
  if (/mareo|vertigo|mareado/.test(t)) return 'dizziness';
  if (/cabeza|migrana|jaqueca|cefalea|sien|frente/.test(t)) return 'headache';
  if (/estomag|abdom|barriga|panza|digest|inflam|gases|diarrea|estren|colico|intestin|vientre/.test(t)) return 'digestive';
  return 'general';
}

export interface ReliefContext {
  intensity: number | null;
  /** Horas desde la última comida anotada (null si no hay ninguna hoy). */
  hoursSinceFood: number | null;
  /** Ya tomó algún medicamento para esto hoy. */
  tookMedication: boolean;
}

export const ideasForKind = (kind: SymptomKind) => RELIEF_IDEAS.filter((i) => i.kinds.includes(kind));

/** Elección sin IA: las 3 más pertinentes según el tipo y lo que se sabe del día. */
export function localReliefIdeas(kind: SymptomKind, ctx: ReliefContext): ReliefIdea[] {
  const pool = ideasForKind(kind);
  const score = (i: ReliefIdea) => {
    let s = pool.length - pool.indexOf(i); // orden del catálogo como base
    if (i.id === 'comer-algo') s += ctx.hoursSinceFood === null || ctx.hoursSinceFood >= 4 ? 6 : -10;
    if (i.id === 'oscuro' && (ctx.intensity ?? 0) >= 6) s += 4;
    if (i.id === 'cuello' && (ctx.intensity ?? 0) >= 7) s -= 5; // con dolor fuerte, mejor quieto
    if (i.id === 'caminar' && (ctx.intensity ?? 0) >= 7) s -= 6;
    return s;
  };
  return [...pool].sort((a, b) => score(b) - score(a)).slice(0, 3);
}

/** Valida lo que eligió la IA: solo ids del catálogo y del tipo correcto, sin repetir, máximo 3. */
export function pickValidIdeas(ids: unknown, kind: SymptomKind): ReliefIdea[] {
  if (!Array.isArray(ids)) return [];
  const allowed = new Map(ideasForKind(kind).map((i) => [i.id, i]));
  const out: ReliefIdea[] = [];
  for (const id of ids) {
    const idea = typeof id === 'string' ? allowed.get(id) : undefined;
    if (idea && !out.includes(idea)) out.push(idea);
    if (out.length === 3) break;
  }
  return out;
}

export type Helped = 'yes' | 'some' | 'no';
export interface ReliefTry {
  id: string;
  helped: Helped | null;
  at: string;
}

export const HELPED_LABEL: Record<Helped, string> = { yes: 'Sí', some: 'Un poco', no: 'No' };

/** Medidas probadas guardadas en el síntoma (data.relief). */
export function reliefTries(e: StoredEvent): ReliefTry[] {
  if (e.type !== 'symptom') return [];
  const r = (e.data as { relief?: unknown }).relief;
  return Array.isArray(r) ? (r as ReliefTry[]) : [];
}

export const ideaById = (id: string) => RELIEF_IDEAS.find((i) => i.id === id);

/* ---------- contexto desde los registros ---------- */

const eventTime = (e: StoredEvent, entry: Entry) => new Date(e.occurred_at ?? entry.recordedAt).getTime();

export interface SymptomRef {
  event: StoredEvent;
  entry: Entry;
  name: string;
  kind: SymptomKind;
  at: Date;
}

function toRef(event: StoredEvent, entry: Entry): SymptomRef {
  const d = event.data as { name?: string; body_location?: string | null };
  const name = d.name ?? 'malestar';
  return { event, entry, name, kind: symptomKind(name, d.body_location), at: new Date(eventTime(event, entry)) };
}

export function findSymptom(entries: Entry[], eventId: string): SymptomRef | null {
  for (const entry of entries) {
    const event = entry.events.find((e) => e.id === eventId && e.type === 'symptom');
    if (event) return toRef(event, entry);
  }
  return null;
}

/** Síntoma más reciente de las últimas `hours` horas (para la tarjeta de Hoy). */
export function recentSymptom(entries: Entry[], now = new Date(), hours = 6): SymptomRef | null {
  let best: SymptomRef | null = null;
  const min = now.getTime() - hours * 3600_000;
  for (const entry of entries) {
    for (const event of entry.events) {
      if (event.type !== 'symptom') continue;
      const t = eventTime(event, entry);
      if (t < min || t > now.getTime() + 60_000) continue;
      if (!best || t > best.at.getTime()) best = toRef(event, entry);
    }
  }
  return best;
}

export function reliefContext(entries: Entry[], ref: SymptomRef, now = new Date()): ReliefContext {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  let lastFood: number | null = null;
  let tookMedication = false;
  for (const entry of entries) {
    for (const e of entry.events) {
      const t = eventTime(e, entry);
      if (t < dayStart.getTime() || t > now.getTime() + 60_000) continue;
      if (e.type === 'food' && (lastFood === null || t > lastFood)) lastFood = t;
      if (e.type === 'medication' && t >= ref.at.getTime() - 2 * 3600_000) tookMedication = true;
    }
  }
  const intensity = (ref.event.data as { intensity_0_10?: number | null }).intensity_0_10 ?? null;
  return { intensity, hoursSinceFood: lastFood === null ? null : (now.getTime() - lastFood) / 3600_000, tookMedication };
}
