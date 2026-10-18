/**
 * IA simulada: convierte lo que dijo la persona en datos estructurados.
 *
 * Misma firma y mismo esquema (`ExtractionSchema`) que tendría la versión con un LLM real detrás de un
 * proxy: la interfaz no cambia el día que se conecte. Es un analizador por reglas en español de Colombia,
 * con latencia simulada (~1–1.5 s) para que el estado "Kalma está entendiendo…" sea realista.
 */
import { addHours, addMinutes, parseISO, setHours, setMinutes, subDays } from 'date-fns';
import { detectRedFlags } from '@/lib/redFlags';
import { ExtractionSchema, type Extraction, type ExtractedEvent } from '@/lib/schema';
import { FOODS, MEDICATIONS, normalize, type FoodEntry } from './foodDictionary';

export interface ExtractOptions {
  recordedAt?: string;
  tz?: string;
  /** Latencia simulada en ms (0 en pruebas). */
  latencyMs?: number;
}

export async function extractEntry(transcript: string, opts: ExtractOptions = {}): Promise<Extraction> {
  const latency = opts.latencyMs ?? 1000 + Math.random() * 500;
  if (latency > 0) await new Promise((r) => setTimeout(r, latency));
  return extractEntrySync(transcript, opts);
}

/* ---------- utilidades de texto ---------- */

const NUMBERS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};
const toNumber = (s: string) => (NUMBERS[s] ?? Number(s.replace(',', '.')));

/** Palabras que indican duda: bajan la confianza y disparan "¿Es correcto?". */
const HEDGE = /\b(creo|como que|algo|no se|tal vez|talvez|no me acuerdo|quizas|medio|mas o menos raro)\b/;

/* ---------- tiempo ---------- */

type Precision = ExtractedEvent['occurred_at_precision'];
interface When {
  at: Date | null;
  precision: Precision;
  partOfDay?: 'mañana' | 'tarde' | 'noche';
}

function resolveTime(n: string, base: Date, meal: Meal | null): When {
  let day = base;
  if (/\bayer\b/.test(n)) day = subDays(base, 1);
  if (/\banoche\b/.test(n)) return { at: setMinutes(setHours(subDays(base, base.getHours() < 12 ? 1 : 0), 21), 0), precision: 'part_of_day', partOfDay: 'noche' };
  const at = (h: number, m = 0) => setMinutes(setHours(day, h), m);

  const clock = n.match(/\ba las (\d{1,2})(?::(\d{2})| y (media|cuarto))?( de la (manana|tarde|noche))?/);
  if (clock) {
    let h = Number(clock[1]);
    const m = clock[2] ? Number(clock[2]) : clock[3] === 'media' ? 30 : clock[3] === 'cuarto' ? 15 : 0;
    const q = clock[5];
    if (q === 'tarde' || q === 'noche') { if (h < 12) h += 12; }
    else if (!q && h >= 1 && h <= 7) h += 12; // "a las 3" casi siempre es de la tarde
    return { at: at(h, m), precision: 'exact' };
  }
  const ago = n.match(/\bhace (un rato|media hora|una hora|(\d+|dos|tres|cuatro) horas?)/);
  if (ago) {
    if (ago[1] === 'un rato') return { at: addMinutes(base, -30), precision: 'approximate' };
    if (ago[1] === 'media hora') return { at: addMinutes(base, -30), precision: 'approximate' };
    const hrs = ago[2] ? toNumber(ago[2]) : 1;
    return { at: addHours(base, -hrs), precision: 'approximate' };
  }
  if (/despues del almuerzo|despues de almorzar/.test(n)) return { at: at(14), precision: 'part_of_day', partOfDay: 'tarde' };
  if (/despues del desayuno|despues de desayunar/.test(n)) return { at: at(9), precision: 'part_of_day', partOfDay: 'mañana' };
  if (/despues de (la )?comida|despues de comer de noche|despues de cenar/.test(n)) return { at: at(21), precision: 'part_of_day', partOfDay: 'noche' };
  if (/(en|por) la manana|esta manana|al despertar|al levantarme/.test(n)) return { at: at(8), precision: 'part_of_day', partOfDay: 'mañana' };
  if (/medio ?dia/.test(n)) return { at: at(12), precision: 'part_of_day', partOfDay: 'tarde' };
  if (/(en|por) la tarde|esta tarde/.test(n)) return { at: at(15), precision: 'part_of_day', partOfDay: 'tarde' };
  if (/(en|por) la noche|esta noche/.test(n)) return { at: at(20), precision: 'part_of_day', partOfDay: 'noche' };
  if (/\b(ahorita|ahora|en este momento)\b|\bme (esta )?(duele|doliendo)\b|\btengo\b|\bestoy\b/.test(n)) return { at: base, precision: 'exact' };
  if (meal) {
    const h = { breakfast: [7, 30], lunch: [12, 30], snack: [16, 0], dinner: [19, 30] }[meal] as [number, number];
    return { at: at(h[0], h[1]), precision: 'approximate' };
  }
  return { at: null, precision: 'unknown' };
}

/* ---------- comidas ---------- */

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

function mealOf(n: string): Meal | null {
  if (/desayun/.test(n)) return 'breakfast';
  if (/almor|almuerzo/.test(n)) return 'lunch';
  if (/\bonces\b|algo de media tarde|merienda/.test(n)) return 'snack';
  if (/\bcen[eéa]\b|\bcomida\b|de comida/.test(n)) return 'dinner';
  return null;
}

/** Busca comidas del diccionario; prefiere la coincidencia más larga ("arepa con queso" antes que "arepa"). */
function findFoods(n: string): { food: FoodEntry; said: string; qty: number | null }[] {
  const candidates = FOODS.flatMap((food) => food.says.map((s) => ({ food, s }))).sort((a, b) => b.s.length - a.s.length);
  let rest = ` ${n} `;
  const found: { food: FoodEntry; said: string; qty: number | null }[] = [];
  for (const { food, s } of candidates) {
    // Acepta plural: "dos tintos", "unas empanadas"
    const re = new RegExp(`(?:\\b(\\d+|un|una|unos|unas|dos|tres|cuatro|cinco)\\s+)?\\b${s}(?:s|es)?\\b`);
    const m = rest.match(re);
    if (!m) continue;
    if (found.some((f) => f.food === food)) continue;
    const qty = m[1] ? toNumber(m[1]) : NaN; // "unos/unas" → cantidad sin especificar
    found.push({ food, said: m[0].trim(), qty: Number.isFinite(qty) ? qty : null });
    rest = rest.replace(m[0], ' '.repeat(m[0].length)); // consumir para no contar dos veces
  }
  return found;
}

/* ---------- síntomas ---------- */

const SYMPTOMS: { re: RegExp; name: string; location: string | null }[] = [
  { re: /dolor de cabeza|(doli\w*|duele|duelo|dolia) (\w+ )?la cabeza|cabeza (me )?(duele|dolia|dolio)|migrana|jaqueca/, name: 'dolor de cabeza', location: 'cabeza' },
  { re: /dolor de (estomago|barriga|panza)|(duele|doli\w*|dolia) (\w+ )?(el estomago|la barriga|la panza)|retorcijon|colico|inflamad[ao]|inflamacion|gases|llenura|estomago (revuelto|malo|pesado)/, name: 'molestia digestiva', location: 'abdomen' },
  { re: /acidez|agrieras|reflujo|ardor en el (estomago|pecho)/, name: 'acidez', location: 'estómago' },
  { re: /nausea|ganas de vomitar|ganas de devolver/, name: 'náuseas', location: null },
  { re: /diarrea|suelto del estomago|soltura/, name: 'diarrea', location: 'abdomen' },
  { re: /\bmare[oa]\w*|vertigo/, name: 'mareo', location: null },
  { re: /cansad[ao]|agotad[ao]|sin energia|fatiga/, name: 'cansancio', location: null },
  // También se registran si la persona dice "fue un error" en la pantalla de emergencia y decide guardar.
  { re: /(dolor|duele|presion|opresion)\w* (\w+ ){0,3}pecho|pecho (\w+ ){0,2}(duele|dolor)/, name: 'dolor en el pecho', location: 'pecho' },
  { re: /cuesta respirar|falta (el )?aire|dificultad (para|al) respirar|no (puedo|logro) respirar/, name: 'dificultad para respirar', location: 'pecho' },
];

function intensityOf(n: string): { value: number | null; inferred: boolean } {
  const num = n.match(/\b(\d{1,2}) de (10|diez)\b|\b(?:un|como un|en) (\d{1,2})\b/);
  if (num) {
    const v = Number(num[1] ?? num[3]);
    if (v >= 0 && v <= 10) return { value: v, inferred: false };
  }
  // Mapa del brief: "un poquito" 2–3, "molesto" 4–6, "fuerte/duro" 7–8, "el peor" 9–10
  if (/el peor|insoportable|horrible|terrible|durisimo|muy muy fuerte/.test(n)) return { value: 9, inferred: true };
  if (/muy fuerte|bastante fuerte|muy duro/.test(n)) return { value: 8, inferred: true };
  if (/\bfuerte\b|\bduro\b|berraco|tenaz/.test(n)) return { value: 7, inferred: true };
  if (/molest[oa]|moderad[oa]|regular|maluco|harto/.test(n)) return { value: 5, inferred: true };
  if (/un poquito|poquito|leve|suave|un poco|bajito/.test(n)) return { value: 3, inferred: true };
  return { value: null, inferred: false };
}

const sideOf = (n: string) =>
  /izquierd/.test(n) ? 'left' : /derech/.test(n) ? 'right' : /ambos lados|toda la cabeza/.test(n) ? 'both' : null;

/* ---------- respuesta a la pregunta de seguimiento ---------- */

export const INTENSITY_REPLIES = ['Leve', 'Moderado', 'Fuerte', 'Muy fuerte'] as const;
export const RELIEF_REPLIES = ['Sí, del todo', 'Un poco', 'No', 'Todavía no sé'] as const;
export const SLEEP_REPLIES = ['Menos de 5', '5 a 6', '6 a 7', 'Más de 7'] as const;

/** Aplica la respuesta rápida al evento al que apunta la pregunta. Devuelve los eventos actualizados. */
export function applyFollowUpAnswer(extraction: Extraction, answer: string): ExtractedEvent[] {
  const idx = extraction.follow_up.target_event_index;
  if (idx === null) return extraction.events;
  return extraction.events.map((e, i) => {
    if (i !== idx) return e;
    if (e.type === 'symptom') {
      const map: Record<string, number> = { Leve: 3, Moderado: 5, Fuerte: 7, 'Muy fuerte': 9 };
      if (answer in map) return { ...e, confidence: Math.max(e.confidence, 0.9), data: { ...e.data, intensity_0_10: map[answer]!, intensity_inferred: false } };
    }
    if (e.type === 'medication') {
      const map: Record<string, 'full' | 'partial' | 'none' | 'unknown'> = { 'Sí, del todo': 'full', 'Un poco': 'partial', No: 'none', 'Todavía no sé': 'unknown' };
      if (answer in map) return { ...e, data: { ...e.data, relief: map[answer]! } };
    }
    if (e.type === 'sleep') {
      const map: Record<string, number> = { 'Menos de 5': 4.5, '5 a 6': 5.5, '6 a 7': 6.5, 'Más de 7': 7.5 };
      if (answer in map) return { ...e, confidence: 0.9, data: { ...e.data, hours: map[answer]! } };
    }
    return e;
  });
}

/* ---------- extracción ---------- */

const CLAUSE_SPLIT = /[,.;!?]|\by luego\b|\bluego\b|\bdespues de eso\b|\bentonces\b|\by (?=(me|mi|desayun|almor|com[ií]|cen[eé]|dorm|tom|hic|camin|fui|estoy|tengo|de onces|al))/g;
const LONE_CONNECTOR = /^(me|mi|desayun|almor|com[ií]|cen[eé]|dorm|tom|hic|camin|fui|estoy|tengo|de onces|al)$/;

/**
 * Normaliza carácter por carácter (misma longitud que el original: "é" → "e", "ñ" → "n") para poder
 * cortar las cláusulas sobre el texto normalizado y mostrar el fragmento ORIGINAL, con tildes,
 * como "lo que dijiste".
 */
const normalizeKeepLength = (s: string) =>
  [...s].map((ch) => ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || ch).join('');

function splitClauses(text: string): { orig: string; norm: string }[] {
  const norm = normalizeKeepLength(text);
  const out: { orig: string; norm: string }[] = [];
  let start = 0;
  const push = (end: number) => {
    const o = text.slice(start, end).trim();
    const n = norm.slice(start, end).trim().replace(/\s+/g, ' ');
    if (n.length > 1 && !LONE_CONNECTOR.test(n)) out.push({ orig: o, norm: n });
  };
  for (const m of norm.matchAll(CLAUSE_SPLIT)) {
    push(m.index);
    start = m.index + m[0].length;
  }
  push(text.length);
  return out;
}

export function extractEntrySync(transcript: string, opts: ExtractOptions = {}): Extraction {
  const base = opts.recordedAt ? parseISO(opts.recordedAt) : new Date();
  const text = transcript.trim();
  const red = detectRedFlags(text);

  const clauses = splitClauses(text);

  const events: ExtractedEvent[] = [];
  const unmatched: string[] = [];
  let lastSymptom: string | null = null;
  let lastWhen: When | null = null;

  for (const { orig, norm: n } of clauses) {
    const before = events.length;
    const hedge = HEDGE.test(n);
    const conf = (c: number) => Math.round((hedge ? Math.min(c, 0.45) : c) * 100) / 100;
    const meal = mealOf(n);
    let when = resolveTime(n, base, meal);
    if (when.precision === 'unknown' && lastWhen) when = lastWhen; // "…y luego me tomé un dolex" hereda el momento
    const iso = when.at ? when.at.toISOString() : null;

    // Sueño
    const sleep = n.match(/dorm\w*\s+(?:como |unas |casi |mas o menos |solo |apenas )?(\d+(?:[.,]\d)?|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)( y media)? horas?/);
    if (sleep || /dormi (muy )?mal|no dormi|dormi fatal|mala noche|no pude dormir/.test(n)) {
      const hours = sleep ? toNumber(sleep[1]!) + (sleep[2] ? 0.5 : 0) : 5;
      const quality = /mal|fatal|poco|me desperte|no descanse|no pude/.test(n) ? 2 : /bien|rico|delicioso|como un bebe/.test(n) ? 4 : null;
      events.push({
        type: 'sleep', occurred_at: setMinutes(setHours(base, 6), 30).toISOString(), occurred_at_precision: 'approximate',
        confidence: conf(sleep ? 0.9 : 0.4), source_text: orig, data: { hours, quality_1_5: quality },
      });
    }

    // Síntomas
    for (const s of SYMPTOMS) {
      if (!s.re.test(n)) continue;
      if (s.name === 'cansancio' && events.some((e) => e.type === 'sleep')) continue;
      const it = intensityOf(n);
      lastSymptom = s.name;
      events.push({
        type: 'symptom', occurred_at: iso, occurred_at_precision: when.precision,
        confidence: conf(it.inferred ? 0.8 : 0.92), source_text: orig,
        data: { name: s.name, body_location: s.location, side: sideOf(n), intensity_0_10: it.value, intensity_inferred: it.inferred, character: /pulsa|palpita|late/.test(n) ? 'pulsátil' : /aprieta|presion/.test(n) ? 'opresivo' : null, duration_minutes: null },
      });
    }

    // Medicamentos
    for (const m of MEDICATIONS) {
      const said = m.says.find((w) => new RegExp(`\\b${w}\\b`).test(n));
      if (!said) continue;
      const relief = /me (alivio|paso|quito)|se me (paso|quito)|santo remedio/.test(normalize(text))
        ? 'full' : /un poco|medio me|algo me/.test(n) && /alivi|ayud/.test(n) ? 'partial'
        : /no me (hizo nada|sirvio|alivio|ayudo)/.test(normalize(text)) ? 'none' : null;
      events.push({
        type: 'medication', occurred_at: iso, occurred_at_precision: when.precision, confidence: conf(0.95), source_text: orig,
        data: { name: m.label, generic_name: m.generic, dose: null, taken_for: lastSymptom, relief },
      });
    }

    // Comidas y bebidas
    for (const { food, said, qty } of findFoods(n)) {
      if (MEDICATIONS.some((m) => m.says.some((w) => said.includes(w)))) continue;
      const data = { name: food.label, canonical_name: food.canonical, categories: [...food.categories], meal, quantity: qty ? String(qty) : null };
      const common = { occurred_at: iso, occurred_at_precision: when.precision, confidence: conf(0.9), source_text: orig };
      events.push(food.kind === 'drink' ? { type: 'drink', ...common, data } : { type: 'food', ...common, data });
    }
    // "algo con queso", "algo de comer": comida genérica de baja confianza
    if (events.length === before && /\b(comi|almorce|desayune|cene)\b/.test(n)) {
      const cheese = /queso|lacteo|leche/.test(n);
      events.push({
        type: 'food', occurred_at: iso, occurred_at_precision: when.precision, confidence: 0.4, source_text: orig,
        data: { name: cheese ? 'Algo con queso' : 'Comida sin especificar', canonical_name: cheese ? 'queso' : 'comida', categories: cheese ? ['lácteo'] : [], meal, quantity: null },
      });
    }

    // Estrés y ánimo (inferidos de palabras)
    if (/estres|estresad|ansios|angustiad|cierre|mucho trabajo|presion en el trabajo|agobiad/.test(n)) {
      events.push({ type: 'stress', occurred_at: iso, occurred_at_precision: when.precision === 'unknown' ? 'part_of_day' : when.precision, confidence: conf(0.72), source_text: orig, data: { level_0_10: /muy|demasiado|full/.test(n) ? 8 : 7 } });
    } else if (/tranquil|relajad|en paz/.test(n)) {
      events.push({ type: 'stress', occurred_at: iso, occurred_at_precision: 'part_of_day', confidence: conf(0.7), source_text: orig, data: { level_0_10: 2 } });
    }
    if (/triste|bajonead|desanimad|aburrid|achantad/.test(n)) {
      events.push({ type: 'mood', occurred_at: iso, occurred_at_precision: 'part_of_day', confidence: conf(0.7), source_text: orig, data: { level_0_10: 3 } });
    } else if (/feliz|content[ao]|animad[ao]|de buen genio/.test(n)) {
      events.push({ type: 'mood', occurred_at: iso, occurred_at_precision: 'part_of_day', confidence: conf(0.7), source_text: orig, data: { level_0_10: 8 } });
    }

    // Agua, actividad, periodo
    const water = n.match(/\b(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s+vasos? de agua/);
    if (water) events.push({ type: 'water', occurred_at: iso, occurred_at_precision: 'part_of_day', confidence: conf(0.95), source_text: orig, data: { glasses: toNumber(water[1]!) } });
    const act = n.match(/\b(camin\w*|trot\w*|gimnasio|gym|yoga|bici\w*|nad[eé]\w*)\b(?:.*?(\d+) minutos)?/);
    if (act) {
      const name = /camin/.test(act[1]!) ? 'caminata' : /trot/.test(act[1]!) ? 'trote' : /yoga/.test(act[1]!) ? 'yoga' : /bici/.test(act[1]!) ? 'bicicleta' : /nad/.test(act[1]!) ? 'natación' : 'gimnasio';
      events.push({ type: 'activity', occurred_at: iso, occurred_at_precision: when.precision, confidence: conf(0.9), source_text: orig, data: { name, duration_minutes: act[2] ? Number(act[2]) : null, intensity: name === 'gimnasio' || name === 'trote' ? 'vigorous' : 'light' } });
    }
    if (/me (llego|vino|bajo) (el periodo|la regla|el mes)|estoy con el periodo|tengo la regla/.test(n)) {
      events.push({ type: 'menstrual', occurred_at: iso, occurred_at_precision: 'part_of_day', confidence: conf(0.9), source_text: orig, data: { flow: null } });
    }

    if (events.length === before) unmatched.push(orig);
    else lastWhen = when;
  }

  // Máximo UNA pregunta de seguimiento (ley de Hick): intensidad faltante > alivio > horas de sueño dudosas
  let follow_up: Extraction['follow_up'] = { question: null, quick_replies: [], target_event_index: null };
  const noIntensity = events.findIndex((e) => e.type === 'symptom' && e.data.intensity_0_10 === null);
  const noRelief = events.findIndex((e) => e.type === 'medication' && e.data.relief === null && e.data.taken_for);
  const guessSleep = events.findIndex((e) => e.type === 'sleep' && e.confidence < 0.6);
  if (!red.detected) {
    if (noIntensity >= 0) {
      const e = events[noIntensity]!;
      follow_up = { question: `¿Qué tan fuerte es ${e.type === 'symptom' ? (e.data.name === 'molestia digestiva' ? 'la molestia' : `el ${e.data.name}`) : 'el síntoma'}?`, quick_replies: [...INTENSITY_REPLIES], target_event_index: noIntensity };
    } else if (noRelief >= 0) {
      const e = events[noRelief]!;
      follow_up = { question: `¿Te alivió el ${e.type === 'medication' ? (e.data.generic_name ?? e.data.name) : 'medicamento'}?`, quick_replies: [...RELIEF_REPLIES], target_event_index: noRelief };
    } else if (guessSleep >= 0) {
      follow_up = { question: '¿Cuántas horas dormiste, más o menos?', quick_replies: [...SLEEP_REPLIES], target_event_index: guessSleep };
    }
  }

  const result: Extraction = {
    summary: summarize(events),
    events,
    red_flag: { detected: red.detected, categories: red.categories, evidence: red.evidence },
    follow_up,
    unparsed: events.length === 0 ? text : unmatched.length ? unmatched.join(' · ') : null,
  };
  return ExtractionSchema.parse(result); // el mock cumple el contrato igual que lo haría el LLM
}

function summarize(events: ExtractedEvent[]): string {
  if (events.length === 0) return 'No encontré síntomas, comidas ni hábitos en lo que dijiste.';
  const parts = events.map((e) => {
    switch (e.type) {
      case 'symptom': return e.data.intensity_0_10 !== null ? `${e.data.name} (${e.data.intensity_0_10}/10)` : e.data.name;
      case 'food': case 'drink': return e.data.name.toLowerCase();
      case 'medication': return e.data.generic_name ?? e.data.name;
      case 'sleep': return `${e.data.hours} h de sueño`;
      case 'stress': return 'estrés';
      case 'mood': return 'ánimo';
      case 'water': return 'agua';
      case 'activity': return e.data.name;
      default: return e.type;
    }
  });
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : parts[0]!;
  return `Registro con ${list}.`;
}

