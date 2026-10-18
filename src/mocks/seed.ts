/**
 * Datos semilla de la usuaria demo "Laura" (27, migraña, trabaja frente a pantallas, toma mucho tinto,
 * duerme mal en época de cierre de mes).
 *
 * 45 días realistas, DETERMINÍSTICOS (PRNG con semilla fija) y relativos a "hoy", con:
 *  - Patrón plantado 1: dormir < 6 h → dolor de cabeza 6–24 h después.
 *  - Patrón plantado 2: lácteos → molestia digestiva 0–6 h después.
 *  - Ruido independiente (tinto, almuerzos, estrés, ánimo, agua, ejercicio): NO debe salir como patrón fuerte.
 *  - 3 días sin registro y un experimento terminado ("acostarme antes de las 11 p. m.", 14 días).
 *
 * Los efectos plantados se asignan por CUOTA (no por sorteo independiente): primero se deciden las
 * noches cortas / los días con lácteo y luego se marca exactamente el % indicado en SEED_RATES,
 * eligiendo cuáles al azar. Así la fuerza del patrón es la diseñada con cualquier semilla
 * (con sorteos independientes y pocos días, el azar podía dejar el patrón casi invisible).
 */
import { addMinutes, setHours, setMinutes, startOfDay, subDays } from 'date-fns';
import { dayKey } from '@/lib/dates';
import type { Consent, Entry, Experiment, ExtractedEvent, Profile, StoredEvent } from '@/lib/schema';
import { findFood, MEDICATIONS, type FoodEntry } from './foodDictionary';

export const SEED_RATES = {
  /** P(dormir < 6 h) en cierre de mes / resto del mes / días cumplidos del experimento. */
  shortSleep: { closing: 0.65, normal: 0.3, experiment: 0.08 },
  /** Fracción de días con dolor de cabeza según la noche anterior (cuota exacta). */
  headache: { afterShortSleep: 0.75, baseline: 0.08 },
  /** Fracción de días con molestia digestiva: con algún lácteo / sin lácteo (cuota exacta). */
  digestive: { dairyDay: 0.7, baseline: 0.06 },
  dairyBreakfast: 0.4,
  snack: 0.35,
  checkin: 0.82,
} as const;

/** Días (hacia atrás desde hoy) sin ningún registro. */
export const SKIPPED_DAYS_AGO = [12, 27, 33];
/** El experimento ocupó los días 21 → 8 atrás (14 días) y terminó hace una semana. */
export const EXPERIMENT_DAYS_AGO = { start: 21, end: 8 };

/* ---------- PRNG determinístico (mulberry32) ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = ReturnType<typeof mulberry32>;
const chance = (r: Rng, p: number) => r() < p;
const between = (r: Rng, a: number, b: number) => a + r() * (b - a);
const int = (r: Rng, a: number, b: number) => Math.floor(between(r, a, b + 1));
const pick = <T,>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;

/** Elige exactamente round(rate · n) elementos al azar (Fisher–Yates parcial). */
function quota<T>(r: Rng, xs: T[], rate: number): Set<T> {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return new Set(a.slice(0, Math.round(rate * a.length)));
}

/* ---------- constructores de eventos ---------- */

const at = (day: Date, h: number, m = 0) => setMinutes(setHours(day, h), m);
const iso = (d: Date) => d.toISOString();
const conf = (r: Rng) => Math.round(between(r, 0.82, 0.98) * 100) / 100;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const isDairy = (f: FoodEntry) => f.categories.includes('lácteo');

type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';

function foodEvent(r: Rng, f: FoodEntry, when: Date, meal: Meal, phrase: string, quantity?: string): ExtractedEvent {
  const data = { name: f.label, canonical_name: f.canonical, categories: [...f.categories], meal, quantity: quantity ?? null };
  const common = { occurred_at: iso(when), occurred_at_precision: 'approximate' as const, confidence: conf(r), source_text: phrase };
  return f.kind === 'drink' ? { type: 'drink', ...common, data } : { type: 'food', ...common, data };
}

/* ---------- menú de Laura ---------- */

const BREAKFAST_DAIRY = ['Perico', 'Changua', 'Arepa con queso', 'Pandebono', 'Almojábana', 'Yogur'] as const;
const BREAKFAST_PLAIN = ['Arepa', 'Huevos pericos', 'Fruta'] as const;
const LUNCH = ['Corrientazo', 'Bandeja paisa', 'Arroz con pollo', 'Sancocho', 'Ensalada', 'Empanada', 'Ajiaco'] as const;
const SNACK = ['Pandebono', 'Buñuelo', 'Yogur', 'Fruta', 'Empanada', 'Gaseosa'] as const;
const DINNER = ['Arepa', 'Huevos pericos', 'Ensalada', 'Sancocho', 'Comida rápida', 'Pizza'] as const;

/* ---------- plan de un día (pasada 1) ---------- */

interface DayPlan {
  ago: number;
  day: Date;
  key: string;
  skipped: boolean;
  short: boolean;
  hours: number;
  quality: number;
  wake: Date;
  tintos: number;
  meals: { food: FoodEntry; time: Date; meal: Meal }[];
  activity: { act: 'caminé' | 'hice yoga' | 'fui al gimnasio'; mins: number; time: Date } | null;
  checkin: { stress: number; mood: number; glasses: number; time: Date } | null;
}

export interface SeedResult {
  entries: Entry[];
  experiments: Experiment[];
  profile: Profile;
  consent: Consent;
  /** Verdad de base para pruebas y para explicar la demo. */
  truth: {
    shortSleepDays: string[];
    headacheDays: string[];
    dairyDays: string[];
    digestiveDays: string[];
    skippedDays: string[];
  };
}

export function generateSeed({ now = new Date(), seed = 20261017, days = 45 }: { now?: Date; seed?: number; days?: number } = {}): SeedResult {
  const r = mulberry32(seed);
  const today = startOfDay(now);
  const adherence: Record<string, boolean> = {};

  /* Pasada 1: qué pasó cada día (sueño, comidas, rutina) */
  const plans: DayPlan[] = [];
  for (let ago = days - 1; ago >= 0; ago--) {
    const day = subDays(today, ago);
    const key = dayKey(day);
    const dom = day.getDate();
    const closing = dom >= 25 || dom <= 2;
    const inExperiment = ago <= EXPERIMENT_DAYS_AGO.start && ago >= EXPERIMENT_DAYS_AGO.end;
    const adhered = inExperiment && chance(r, 0.86);
    if (inExperiment) adherence[key] = adhered;

    const short = chance(r, adhered ? SEED_RATES.shortSleep.experiment : closing ? SEED_RATES.shortSleep.closing : SEED_RATES.shortSleep.normal);
    const hours = short ? Math.round(between(r, 4.5, 5.8) * 2) / 2 : Math.round(between(r, 6.5, 8.2) * 2) / 2;
    const wake = at(day, 6, int(r, 0, 50));

    const bf = findFood(chance(r, SEED_RATES.dairyBreakfast) ? pick(r, BREAKFAST_DAIRY) : pick(r, BREAKFAST_PLAIN));
    const meals: DayPlan['meals'] = [
      { food: bf, time: addMinutes(wake, int(r, 40, 80)), meal: 'breakfast' },
      { food: findFood(pick(r, LUNCH)), time: at(day, 12, int(r, 15, 75)), meal: 'lunch' },
    ];
    if (chance(r, SEED_RATES.snack)) meals.push({ food: findFood(pick(r, SNACK)), time: at(day, 16, int(r, 0, 50)), meal: 'snack' });
    meals.push({ food: findFood(pick(r, DINNER)), time: at(day, 19, int(r, 10, 70)), meal: 'dinner' });

    const activity = chance(r, 0.3)
      ? { act: pick(r, ['caminé', 'hice yoga', 'fui al gimnasio'] as const), mins: int(r, 20, 60), time: at(day, 18, int(r, 0, 40)) }
      : null;
    const checkin = chance(r, SEED_RATES.checkin)
      ? { stress: int(r, 2, 8), mood: int(r, 3, 8), glasses: int(r, 3, 8), time: at(day, 21, int(r, 0, 50)) }
      : null;

    plans.push({
      ago, day, key, skipped: SKIPPED_DAYS_AGO.includes(ago), short, hours,
      quality: short ? int(r, 1, 2) : int(r, 3, 5), wake, tintos: int(r, 1, 3), meals, activity, checkin,
    });
  }

  /* Pasada 2: efectos plantados por cuota (solo días con registro y ya terminados, para no inventar el futuro) */
  const recorded = plans.filter((p) => !p.skipped);
  const complete = recorded.filter((p) => p.ago > 0);
  const headacheDays = new Set([
    ...quota(r, complete.filter((p) => p.short), SEED_RATES.headache.afterShortSleep),
    ...quota(r, complete.filter((p) => !p.short), SEED_RATES.headache.baseline),
  ]);
  const hasDairy = (p: DayPlan) => p.meals.some((m) => isDairy(m.food));
  const digestiveDays = new Set([
    ...quota(r, complete.filter(hasDairy), SEED_RATES.digestive.dairyDay),
    ...quota(r, complete.filter((p) => !hasDairy(p)), SEED_RATES.digestive.baseline),
  ]);

  // Ruido balanceado: el estrés alto (≥ 6) cae en la MISMA proporción de días con y sin dolor de cabeza,
  // así ningún análisis puede confundir estrés con el patrón plantado de sueño.
  const withCheckin = complete.filter((p) => p.checkin);
  const highStress = new Set([
    ...quota(r, withCheckin.filter((p) => headacheDays.has(p)), 0.4),
    ...quota(r, withCheckin.filter((p) => !headacheDays.has(p)), 0.4),
  ]);
  for (const p of withCheckin) p.checkin!.stress = highStress.has(p) ? int(r, 6, 8) : int(r, 2, 5);

  /* Pasada 3: construir los registros como los habría dictado Laura */
  const entries: Entry[] = [];
  let entryN = 0;
  const push = (recordedAt: Date, source: Entry['source'], phrases: string[], events: ExtractedEvent[], summary: string) => {
    if (recordedAt > now || events.length === 0) return; // nada en el futuro
    const id = `seed-${dayKey(recordedAt)}-${++entryN}`;
    const stored: StoredEvent[] = events.map((e, i) => ({ ...e, id: `${id}-${i}`, entryId: id, edited: false }));
    const transcript = phrases.join(', ');
    entries.push({ id, recordedAt: iso(recordedAt), source, transcript: transcript.charAt(0).toUpperCase() + transcript.slice(1) + '.', summary, events: stored });
  };

  for (const p of recorded) {
    const { day, wake } = p;

    // Mañana: sueño + tinto + desayuno
    const sleepPhrase = p.short
      ? `dormí como ${String(p.hours).replace('.', ',')} horas, ${pick(r, ['muy mal', 'me desperté mucho', 'no descansé'])}`
      : `dormí ${String(p.hours).replace('.5', ' y media')} horas`;
    const tintoPhrase = p.tintos === 1 ? 'me tomé un tinto' : `me tomé ${p.tintos === 2 ? 'dos' : 'tres'} tintos`;
    const bf = p.meals[0]!;
    const bfPhrase = `desayuné ${lower(bf.food.label)}`;
    push(addMinutes(bf.time, int(r, 5, 40)), 'seed', [sleepPhrase, tintoPhrase, bfPhrase], [
      { type: 'sleep', occurred_at: iso(wake), occurred_at_precision: 'approximate', confidence: conf(r), source_text: sleepPhrase, data: { hours: p.hours, quality_1_5: p.quality } },
      foodEvent(r, findFood('Tinto'), addMinutes(wake, 30), 'breakfast', tintoPhrase, `${p.tintos} ${p.tintos === 1 ? 'taza' : 'tazas'}`),
      foodEvent(r, bf.food, bf.time, 'breakfast', bfPhrase),
    ], p.short ? 'Durmió poco y desayunó.' : 'Registro de la mañana.');

    // Almuerzo y onces
    for (const m of p.meals.slice(1)) {
      if (m.meal === 'dinner') continue;
      const phrase = m.meal === 'lunch' ? `almorcé ${lower(m.food.label)}` : `de onces ${m.food.kind === 'drink' ? 'una ' : ''}${lower(m.food.label)}`;
      push(addMinutes(m.time, int(r, 10, 45)), 'seed', [phrase], [foodEvent(r, m.food, m.time, m.meal, phrase)], m.meal === 'lunch' ? 'Almuerzo.' : 'Onces.');
    }

    // Patrón 1: dolor de cabeza 7–12 h después de despertar (dentro de la ventana 6–24 h)
    if (headacheDays.has(p)) {
      const start = addMinutes(wake, int(r, 7 * 60, 12 * 60));
      const intensity = p.short ? int(r, 5, 8) : int(r, 3, 6);
      const word = intensity >= 7 ? 'fuerte' : intensity >= 5 ? 'molesto' : 'un poquito';
      const side = pick(r, ['left', 'right', 'both'] as const);
      const where = side === 'both' ? 'en la frente' : `del lado ${side === 'left' ? 'izquierdo' : 'derecho'}`;
      const phrase = `me empezó un dolor de cabeza ${word} ${where}`;
      const ev: ExtractedEvent[] = [{
        type: 'symptom', occurred_at: iso(start), occurred_at_precision: 'approximate', confidence: conf(r), source_text: phrase,
        data: { name: 'dolor de cabeza', body_location: side === 'both' ? 'frente' : 'sien', side, intensity_0_10: intensity, intensity_inferred: false, character: pick(r, ['pulsátil', 'opresivo']), duration_minutes: int(r, 60, 300) },
      }];
      if (intensity >= 5 && chance(r, 0.7)) {
        const med = MEDICATIONS[0];
        ev.push({
          type: 'medication', occurred_at: iso(addMinutes(start, int(r, 20, 60))), occurred_at_precision: 'approximate', confidence: conf(r), source_text: 'me tomé un dolex',
          data: { name: med.label, generic_name: med.generic, dose: '500 mg', taken_for: 'dolor de cabeza', relief: pick(r, ['full', 'partial', 'partial', 'none'] as const) },
        });
      }
      push(addMinutes(start, int(r, 30, 90)), 'seed', ev.map((e) => e.source_text), ev, 'Dolor de cabeza.');
    }

    // Patrón 2: molestia digestiva 1–4 h después del primer lácteo del día (dentro de la ventana 0–6 h)
    if (digestiveDays.has(p)) {
      const trigger = p.meals.find((m) => isDairy(m.food));
      const start = trigger ? addMinutes(trigger.time, int(r, 50, 240)) : at(day, int(r, 10, 20), int(r, 0, 59));
      const intensity = trigger ? int(r, 3, 6) : int(r, 2, 4);
      const phrase = `me dio ${pick(r, ['retorcijón', 'inflamación', 'dolor de estómago'])} ${intensity >= 5 ? 'molesto' : 'un poquito'}`;
      const ev: ExtractedEvent[] = [{
        type: 'symptom', occurred_at: iso(start), occurred_at_precision: 'approximate', confidence: conf(r), source_text: phrase,
        data: { name: 'molestia digestiva', body_location: 'abdomen', side: 'center', intensity_0_10: intensity, intensity_inferred: true, character: 'cólico', duration_minutes: int(r, 30, 150) },
      }];
      if (trigger && chance(r, 0.2)) {
        const med = MEDICATIONS[3];
        ev.push({
          type: 'medication', occurred_at: iso(addMinutes(start, 30)), occurred_at_precision: 'approximate', confidence: conf(r), source_text: 'me tomé una buscapina',
          data: { name: med.label, generic_name: med.generic, dose: '10 mg', taken_for: 'molestia digestiva', relief: pick(r, ['full', 'partial'] as const) },
        });
      }
      push(addMinutes(start, int(r, 20, 60)), 'seed', ev.map((e) => e.source_text), ev, 'Molestia digestiva.');
    }

    // Noche: comida + actividad + check-in (ruido independiente)
    const dinner = p.meals[p.meals.length - 1]!;
    const dinnerPhrase = `de comida ${lower(dinner.food.label)}`;
    const night: ExtractedEvent[] = [foodEvent(r, dinner.food, dinner.time, 'dinner', dinnerPhrase)];
    const phrases = [dinnerPhrase];
    if (p.activity) {
      const { act, mins, time } = p.activity;
      const phrase = `${act} ${mins} minutos`;
      phrases.push(phrase);
      night.push({ type: 'activity', occurred_at: iso(time), occurred_at_precision: 'approximate', confidence: conf(r), source_text: phrase,
        data: { name: act === 'caminé' ? 'caminata' : act === 'hice yoga' ? 'yoga' : 'gimnasio', duration_minutes: mins, intensity: act === 'fui al gimnasio' ? 'vigorous' : 'light' } });
    }
    if (p.checkin) {
      const { stress, mood, glasses, time } = p.checkin;
      phrases.push(`estrés ${stress}`, `ánimo ${mood}`, `${glasses} vasos de agua`);
      night.push(
        { type: 'stress', occurred_at: iso(time), occurred_at_precision: 'part_of_day', confidence: 1, source_text: `estrés ${stress}`, data: { level_0_10: stress } },
        { type: 'mood', occurred_at: iso(time), occurred_at_precision: 'part_of_day', confidence: 1, source_text: `ánimo ${mood}`, data: { level_0_10: mood } },
        { type: 'water', occurred_at: iso(time), occurred_at_precision: 'part_of_day', confidence: 1, source_text: `${glasses} vasos de agua`, data: { glasses } },
      );
      push(addMinutes(time, 2), 'checkin', phrases, night, 'Check-in nocturno.');
    } else {
      push(addMinutes(dinner.time, 30), 'seed', phrases, night, 'Comida.');
    }
  }

  // Un par de correcciones hechas por Laura (para que "Editado por ti" aparezca en la demo).
  for (const e of entries.filter((x) => x.events.some((ev) => ev.type === 'symptom')).slice(2, 4)) {
    const ev = e.events.find((x) => x.type === 'symptom');
    if (ev) ev.edited = true;
  }
  entries.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));

  const consentAt = iso(subDays(now, days));
  return {
    entries,
    experiments: [{
      id: 'seed-exp-1',
      title: 'Acostarme antes de las 11 p. m.',
      factor: 'sueño < 6 h',
      durationDays: 14,
      startDate: dayKey(subDays(today, EXPERIMENT_DAYS_AGO.start)),
      adherence,
      status: 'finished',
      outcome: 'dolor de cabeza',
    }],
    profile: {
      name: 'Laura',
      conditions: ['Migraña', 'Molestias digestivas'],
      goals: ['Entender qué me dispara la migraña', 'Llegar a consulta con datos'],
      medications: [{ name: 'Acetaminofén (Dolex)', generic_name: 'acetaminofén', use: 'rescue' }],
      doctors: [{ name: 'Dra. Rincón', specialty: 'Neurología' }],
      reminderTime: '21:00',
      caregiver: { enabled: false, personName: null },
      onboarded: true,
    },
    consent: { health: true, ai: true, location: false, updatedAt: { health: consentAt, ai: consentAt } },
    truth: {
      shortSleepDays: recorded.filter((p) => p.short).map((p) => p.key),
      headacheDays: [...headacheDays].map((p) => p.key),
      dairyDays: complete.filter(hasDairy).map((p) => p.key),
      digestiveDays: [...digestiveDays].map((p) => p.key),
      skippedDays: plans.filter((p) => p.skipped).map((p) => p.key),
    },
  };
}

/** Perfil vacío para "Empezar desde cero" (lleva al onboarding en la fase 8). */
export const EMPTY_PROFILE: Profile = {
  name: '',
  conditions: [],
  goals: [],
  medications: [],
  doctors: [],
  reminderTime: '21:00',
  caregiver: { enabled: false, personName: null },
  onboarded: false,
};

export const EMPTY_CONSENT: Consent = { health: false, ai: false, location: false, updatedAt: {} };
