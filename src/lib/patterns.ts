/**
 * Motor de patrones (determinístico, en el celular).
 *
 * Método (brief §7):
 *  - Análisis por persona. Unidad = cada día registrado y completo.
 *  - Para cada síntoma (resultado) y cada factor, en ventanas 0–6 h, 6–24 h, 24–48 h y día anterior:
 *      expuesto = el factor ocurrió en la ventana ANTES del momento de referencia del día
 *      (la hora del primer episodio; en días sin episodio, la hora típica de los episodios de esa persona).
 *  - Tabla 2×2 → riesgo relativo (RR) y prueba exacta de Fisher (unilateral: RR > 1).
 *  - Corrección por comparaciones múltiples: Benjamini–Hochberg (q) sobre todas las pruebas.
 *  - Mínimos: ≥ 14 días, ≥ 4 episodios, factor presente y ausente ≥ 3 veces cada uno.
 *  - Niveles: Posible (RR ≥ 1.5) · Probable (+ q < 0.2 y ≥ 6 episodios) · Fuerte (+ q < 0.05 y ≥ 30 días).
 *  - Control de confusión: un factor que deja de asociarse al mirar solo los días SIN un patrón más fuerte
 *    del mismo síntoma (p. ej. "harina", que viene con los lácteos del pandebono) no se muestra.
 *  - Los medicamentos NO son factores: llegan después del síntoma (causalidad inversa) y Kalma nunca
 *    sugiere nada sobre ellos.
 *  - Las explicaciones salen de plantillas, con números y SIN lenguaje causal.
 */
import { addHours, parseISO, subDays } from 'date-fns';
import { dayKey } from './dates';
import type { Entry, StoredEvent } from './schema';
import { allEvents, DAYS_FOR_ANALYSIS, recordedDays } from './selectors';
import type { PatternLevel } from './types';

export const MIN_EPISODES = 4;
export const MIN_EXPOSED = 3;

export type WindowId = '0-6h' | '6-24h' | '24-48h' | 'prev-day';
export const WINDOWS: { id: WindowId; label: string }[] = [
  { id: '0-6h', label: 'en las 6 horas siguientes' },
  { id: '6-24h', label: 'entre 6 y 24 horas después' },
  { id: '24-48h', label: 'uno o dos días después' },
  { id: 'prev-day', label: 'al día siguiente' },
];

/* ---------- factores ---------- */

export interface Factor {
  id: string;
  /** "comer lácteos", "noches de menos de 6 horas" */
  phrase: string;
  /** Etiqueta corta para gráficos: "Lácteos", "Sueño < 6 h" */
  short: string;
  test: (e: StoredEvent) => boolean;
  /** Frase completa con la ventana (algunas suenan mejor con su propia redacción). */
  sentence?: (window: WindowId) => string;
}

const CATEGORY_FACTORS: [string, string, string][] = [
  ['lácteo', 'comer lácteos', 'Lácteos'],
  ['cafeína', 'tomar cafeína', 'Cafeína'],
  ['frito', 'comer fritos', 'Fritos'],
  ['alcohol', 'tomar alcohol', 'Alcohol'],
  ['azúcar', 'comer o tomar azúcar', 'Azúcar'],
  ['harina', 'comer harinas', 'Harinas'],
  ['grasa', 'comer comidas grasosas', 'Grasa'],
  ['cacao', 'comer chocolate', 'Chocolate'],
];

export const FACTORS: Factor[] = [
  {
    id: 'sleep-short',
    phrase: 'noches de menos de 6 horas',
    short: 'Sueño < 6 h',
    test: (e) => e.type === 'sleep' && e.data.hours < 6,
    sentence: (w) =>
      w === '24-48h' ? 'uno o dos días después de una noche de menos de 6 horas'
        : w === 'prev-day' ? 'al día siguiente de una noche de menos de 6 horas'
          : 'después de noches de menos de 6 horas',
  },
  ...CATEGORY_FACTORS.map(([cat, phrase, short]) => ({
    id: `cat-${cat}`,
    phrase,
    short,
    test: (e: StoredEvent) => (e.type === 'food' || e.type === 'drink') && e.data.categories.includes(cat),
  })),
  { id: 'stress-high', phrase: 'días de estrés alto', short: 'Estrés alto', test: (e) => e.type === 'stress' && e.data.level_0_10 >= 6 },
  { id: 'mood-low', phrase: 'días de ánimo bajo', short: 'Ánimo bajo', test: (e) => e.type === 'mood' && e.data.level_0_10 <= 4 },
  { id: 'water-low', phrase: 'días con poca agua', short: 'Poca agua', test: (e) => e.type === 'water' && e.data.glasses <= 3 },
  { id: 'activity', phrase: 'hacer ejercicio', short: 'Ejercicio', test: (e) => e.type === 'activity' },
  { id: 'menstrual', phrase: 'el periodo', short: 'Periodo', test: (e) => e.type === 'menstrual' },
];

/* ---------- estadística ---------- */

const logFact = (() => {
  const cache = [0];
  return (n: number) => {
    for (let i = cache.length; i <= n; i++) cache[i] = cache[i - 1]! + Math.log(i);
    return cache[n]!;
  };
})();

/** Probabilidad hipergeométrica de la tabla [[a,b],[c,d]] con márgenes fijos. */
function hyper(a: number, b: number, c: number, d: number) {
  const n = a + b + c + d;
  return Math.exp(logFact(a + b) + logFact(c + d) + logFact(a + c) + logFact(b + d) - logFact(n) - logFact(a) - logFact(b) - logFact(c) - logFact(d));
}

/**
 * Fisher exacta unilateral (asociación positiva).
 * a = expuesto con episodio · b = expuesto sin episodio · c = no expuesto con episodio · d = no expuesto sin episodio
 */
export function fisherGreater(a: number, b: number, c: number, d: number): number {
  let p = 0;
  const maxA = Math.min(a + b, a + c);
  for (let x = a; x <= maxA; x++) p += hyper(x, a + b - x, a + c - x, d - (a - x));
  return Math.min(1, p);
}

/** Benjamini–Hochberg: q-values en el mismo orden que los p-values. */
export function benjaminiHochberg(ps: number[]): number[] {
  const m = ps.length;
  const order = ps.map((p, i) => ({ p, i })).sort((x, y) => x.p - y.p);
  const q = new Array<number>(m);
  let min = 1;
  for (let k = m - 1; k >= 0; k--) {
    const { p, i } = order[k]!;
    min = Math.min(min, (p * m) / (k + 1));
    q[i] = min;
  }
  return q;
}

/** RR con corrección de Haldane (+0.5) solo si hay ceros, para no dividir entre 0. */
function relativeRisk(a: number, b: number, c: number, d: number) {
  const z = a === 0 || b === 0 || c === 0 || d === 0 ? 0.5 : 0;
  return ((a + z) / (a + b + 2 * z)) / ((c + z) / (c + d + 2 * z));
}

/* ---------- unidades ---------- */

interface DayUnit {
  key: string;
  /** Momento de referencia del día (primer episodio, o la hora típica). */
  ref: Date;
  outcome: boolean;
}

function windowRange(w: WindowId, ref: Date): [Date, Date] {
  switch (w) {
    case '0-6h': return [addHours(ref, -6), ref];
    case '6-24h': return [addHours(ref, -24), addHours(ref, -6)];
    case '24-48h': return [addHours(ref, -48), addHours(ref, -24)];
    case 'prev-day': {
      const start = subDays(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()), 1);
      return [start, addHours(start, 24)];
    }
  }
}

/* ---------- resultado ---------- */

export interface Pattern {
  id: string;
  outcome: string;
  factorId: string;
  window: WindowId;
  level: PatternLevel;
  /** "El 70 % de tus dolores de cabeza llegaron después de noches de menos de 6 horas." */
  statement: string;
  /** "Cuando dormiste menos de 6 horas…: 78 % de los días; si no: 9 %." */
  comparison: string;
  evidence: string;
  table: { a: number; b: number; c: number; d: number };
  rr: number;
  p: number;
  q: number;
  episodes: number;
  days: number;
  /** % de los episodios precedidos por el factor (lo que dice la frase principal). */
  shareOfEpisodes: number;
  rateWith: number;
  rateWithout: number;
  factorShort: string;
  /** Días con el factor y el síntoma (los que sustentan el patrón). */
  supportingDays: string[];
}

export interface PatternAnalysis {
  ready: boolean;
  days: number;
  patterns: Pattern[];
  /** Cuántas combinaciones se probaron (transparencia: por eso existe la corrección q). */
  tested: number;
  /** Factores descartados por ir junto a un patrón más fuerte. */
  explained: { outcome: string; factorId: string; by: string }[];
}

const PLURAL: Record<string, string> = {
  'dolor de cabeza': 'dolores de cabeza',
  'molestia digestiva': 'molestias digestivas',
  náuseas: 'episodios de náuseas',
  mareo: 'mareos',
  acidez: 'episodios de acidez',
  diarrea: 'episodios de diarrea',
  cansancio: 'días de cansancio',
};
export const outcomePlural = (o: string) => PLURAL[o] ?? `episodios de ${o}`;
const pct = (x: number) => Math.round(x * 100);

/**
 * Niveles del brief, con un piso extra para "Posible": p sin corregir < 0.1 y ≥ 3 episodios que lo
 * sustenten. Sin ese piso, coincidencias con p ≈ 0.2 aparecían como hallazgo (D44).
 */
export const POSSIBLE_MAX_P = 0.1;

function levelOf(rr: number, p: number, q: number, supporting: number, episodes: number, days: number): PatternLevel | null {
  if (rr < 1.5 || p >= POSSIBLE_MAX_P || supporting < 3) return null;
  if (q < 0.05 && episodes >= 6 && days >= 30) return 'strong';
  if (q < 0.2 && episodes >= 6) return 'probable';
  return 'possible';
}

function windowSentence(f: Factor, w: WindowId) {
  if (f.sentence) return f.sentence(w);
  const s = {
    '0-6h': `en las 6 horas después de ${f.phrase}`,
    '6-24h': `entre 6 y 24 horas después de ${f.phrase}`,
    '24-48h': `uno o dos días después de ${f.phrase}`,
    'prev-day': `al día siguiente de ${f.phrase}`,
  }[w];
  return s.replace(/de el/g, 'del'); // "después de el periodo" → "después del periodo"
}

type Candidate = Omit<Pattern, 'q' | 'level' | 'id'> & { units: DayUnit[]; factor: Factor };

/** Días completos registrados (sin contar hoy, que todavía no termina). */
const analysisDays = (entries: Entry[], now: Date) => {
  const today = dayKey(now);
  return [...recordedDays(entries)].filter((k) => k !== today).sort();
};

/**
 * Tablas 2×2 (con/sin factor × con/sin síntoma) para cada síntoma, factor y ventana. La usan los
 * patrones (14 días) y las pistas tempranas (5 días): mismo cálculo, distintos umbrales.
 */
function buildCandidates(entries: Entry[], days: string[], opts: { minEpisodes: number; minExposed: number; minAbsent: number }): Candidate[] {
  const events = allEvents(entries).filter((e) => e.occurred_at);
  const daySet = new Set(days);
  const symptoms = events.filter((e): e is Extract<StoredEvent, { type: 'symptom' }> => e.type === 'symptom');
  const outcomes = [...new Set(symptoms.map((s) => s.data.name))];
  const candidates: Candidate[] = [];

  for (const outcome of outcomes) {
    const eps = symptoms.filter((s) => s.data.name === outcome && daySet.has(dayKey(s.occurred_at!)));
    // primer episodio de cada día
    const firstByDay = new Map<string, Date>();
    for (const s of eps) {
      const k = dayKey(s.occurred_at!);
      const t = parseISO(s.occurred_at!);
      const prev = firstByDay.get(k);
      if (!prev || t < prev) firstByDay.set(k, t);
    }
    const episodes = firstByDay.size;
    if (episodes < opts.minEpisodes) continue;

    // hora típica (mediana) de los episodios: referencia para los días sin episodio
    const minutes = [...firstByDay.values()].map((d) => d.getHours() * 60 + d.getMinutes()).sort((x, y) => x - y);
    const median = minutes[Math.floor(minutes.length / 2)]!;

    const units: DayUnit[] = days.map((k) => {
      const first = firstByDay.get(k);
      if (first) return { key: k, ref: first, outcome: true };
      const ref = parseISO(`${k}T00:00:00`);
      ref.setMinutes(median);
      return { key: k, ref, outcome: false };
    });

    for (const factor of FACTORS) {
      const fEvents = events.filter(factor.test).map((e) => parseISO(e.occurred_at!).getTime());
      if (fEvents.length === 0) continue;
      for (const { id: w } of WINDOWS) {
        let a = 0, b = 0, c = 0, d = 0;
        const supporting: string[] = [];
        for (const u of units) {
          const [from, to] = windowRange(w, u.ref);
          const exposed = fEvents.some((t) => t >= from.getTime() && t < to.getTime());
          if (exposed && u.outcome) { a++; supporting.push(u.key); }
          else if (exposed) b++;
          else if (u.outcome) c++;
          else d++;
        }
        if (a + b < opts.minExposed || c + d < opts.minAbsent) continue; // el factor debe estar presente y ausente
        const rr = relativeRisk(a, b, c, d);
        const p = fisherGreater(a, b, c, d);
        const rateWith = a / (a + b);
        const rateWithout = c / (c + d);
        candidates.push({
          outcome, factorId: factor.id, factor, window: w, units,
          statement: '', comparison: '', evidence: '',
          table: { a, b, c, d }, rr, p, episodes, days: days.length,
          shareOfEpisodes: a / episodes, rateWith, rateWithout, factorShort: factor.short, supportingDays: supporting,
        });
      }
    }
  }
  return candidates;
}

/** Analiza los registros. Puro y determinístico: mismos datos → mismos patrones. */
export function analyzePatterns(entries: Entry[], now = new Date()): PatternAnalysis {
  const days = analysisDays(entries, now);
  // El conteo que ve la persona incluye hoy si ya registró algo (igual que en Hoy); los cálculos usan
  // solo días completos, porque el de hoy todavía no termina.
  const counted = recordedDays(entries).size;
  const base: PatternAnalysis = { ready: false, days: counted, patterns: [], tested: 0, explained: [] };
  if (counted < DAYS_FOR_ANALYSIS) return base;
  const candidates = buildCandidates(entries, days, { minEpisodes: MIN_EPISODES, minExposed: MIN_EXPOSED, minAbsent: MIN_EXPOSED });
  const events = allEvents(entries).filter((e) => e.occurred_at);

  // Corrección por comparaciones múltiples sobre TODO lo probado
  const qs = benjaminiHochberg(candidates.map((x) => x.p));
  const scored = candidates.map((x, i) => ({ ...x, q: qs[i]!, level: levelOf(x.rr, x.p, qs[i]!, x.table.a, x.episodes, x.days) }));

  // Por cada síntoma + factor, la mejor ventana (menor p). Así no se repite el mismo hallazgo 4 veces.
  const best = new Map<string, (typeof scored)[number]>();
  for (const s of scored) {
    if (!s.level) continue;
    const k = `${s.outcome}|${s.factorId}`;
    const cur = best.get(k);
    if (!cur || s.p < cur.p) best.set(k, s);
  }

  // Control de confusión dentro de cada síntoma, del más fuerte al más débil
  const order: Record<PatternLevel, number> = { strong: 0, probable: 1, possible: 2 };
  const sorted = [...best.values()].sort((x, y) => order[x.level!] - order[y.level!] || x.p - y.p);
  const accepted: typeof sorted = [];
  const explained: PatternAnalysis['explained'] = [];
  for (const cand of sorted) {
    const stronger = accepted.filter((x) => x.outcome === cand.outcome);
    if (stronger.length > 0) {
      const factorTimes = (f: Factor) => events.filter(f.test).map((e) => parseISO(e.occurred_at!).getTime());
      const exposedTo = (f: Factor, w: WindowId, u: DayUnit) => {
        const [from, to] = windowRange(w, u.ref);
        return factorTimes(f).some((t) => t >= from.getTime() && t < to.getTime());
      };
      // Solo los días SIN ninguno de los factores más fuertes
      const rest = cand.units.filter((u) => !stronger.some((s) => exposedTo(s.factor, s.window, u)));
      let a = 0, b = 0, c = 0, d = 0;
      for (const u of rest) {
        const ex = exposedTo(cand.factor, cand.window, u);
        if (ex && u.outcome) a++; else if (ex) b++; else if (u.outcome) c++; else d++;
      }
      const evaluable = a + b >= MIN_EXPOSED && c + d >= MIN_EXPOSED;
      if (!evaluable || relativeRisk(a, b, c, d) < 1.5) {
        explained.push({ outcome: cand.outcome, factorId: cand.factorId, by: stronger[0]!.factorId });
        continue;
      }
    }
    accepted.push(cand);
  }

  const patterns: Pattern[] = accepted.map((x) => {
    const sentence = windowSentence(x.factor, x.window);
    return {
      id: `${x.outcome}|${x.factorId}|${x.window}`,
      outcome: x.outcome,
      factorId: x.factorId,
      window: x.window,
      level: x.level!,
      statement: `El ${pct(x.shareOfEpisodes)} % de tus ${outcomePlural(x.outcome)} llegaron ${sentence}.`,
      comparison: `Los días con ${x.factor.short.toLowerCase()} tuviste ${x.outcome} el ${pct(x.rateWith)} % de las veces; los días sin, el ${pct(x.rateWithout)} %.`,
      evidence: `${x.table.a} de ${x.episodes} episodios · ${x.days} días`,
      table: x.table, rr: x.rr, p: x.p, q: x.q, episodes: x.episodes, days: x.days,
      shareOfEpisodes: x.shareOfEpisodes, rateWith: x.rateWith, rateWithout: x.rateWithout,
      factorShort: x.factorShort, supportingDays: x.supportingDays,
    };
  });

  return { ready: true, days: counted, patterns, tested: candidates.length, explained };
}

/* ---------- experimentos: antes vs. durante ---------- */

/* ---------- pistas tempranas (5 a 13 días) ---------- */

/** Días registrados para mostrar las primeras pistas (los patrones esperan a DAYS_FOR_ANALYSIS = 14). */
export const EARLY_DAYS = 5;

export interface EarlyHint {
  id: string;
  outcome: string;
  factorId: string;
  /** "3 de tus 4 dolores de cabeza llegaron después de noches de menos de 6 horas." */
  statement: string;
  /** "Los días sin eso, pasó en 1 de 4." */
  contrast: string;
}

/**
 * Pistas tempranas (D83): con 5 a 13 días todavía no hay datos para un patrón, pero la persona no
 * debería esperar dos semanas sin nada. Se muestran SOLO coincidencias muy marcadas y siempre como
 * «Pista temprana: con pocos días puede ser casualidad». Reglas (más exigentes en forma que en
 * estadística, porque con tan pocos días la estadística no alcanza):
 * - el síntoma apareció al menos 3 días, y al menos 3 veces después del factor;
 * - ≥ 60 % de los episodios llegaron después del factor;
 * - el factor NO estuvo todos los días (al menos 2 días sin él): si comes arepa a diario, no es pista;
 * - con el factor el síntoma es al menos 30 puntos más frecuente que sin él.
 * A los 14 días desaparecen: las que eran reales salen como patrón; las casuales, no.
 */
export function earlyHints(entries: Entry[], now = new Date(), max = 3): EarlyHint[] {
  const days = analysisDays(entries, now);
  const counted = recordedDays(entries).size; // mismo conteo que Hoy y Patrones
  if (counted < EARLY_DAYS || counted >= DAYS_FOR_ANALYSIS) return [];
  const candidates = buildCandidates(entries, days, { minEpisodes: 3, minExposed: 3, minAbsent: 2 })
    .filter((x) => x.table.a >= 3 && x.shareOfEpisodes >= 0.6 && x.rateWith - x.rateWithout >= 0.3);

  // Una pista por síntoma + factor (la ventana con más diferencia), las más marcadas primero
  const best = new Map<string, Candidate>();
  for (const x of candidates) {
    const k = `${x.outcome}|${x.factorId}`;
    const cur = best.get(k);
    if (!cur || x.rateWith - x.rateWithout > cur.rateWith - cur.rateWithout) best.set(k, x);
  }
  const ranked = [...best.values()].sort((x, y) => y.table.a - x.table.a || (y.rateWith - y.rateWithout) - (x.rateWith - x.rateWithout) || x.p - y.p);
  // Sin control estadístico de confusión (no hay datos para eso), al menos no se repite la misma
  // historia: si los días de una pista ya los explica otra más marcada (almojábana = lácteo + harina),
  // se descarta.
  const accepted: Candidate[] = [];
  for (const x of ranked) {
    const covered = new Set(accepted.filter((y) => y.outcome === x.outcome).flatMap((y) => y.supportingDays));
    if (x.supportingDays.every((d) => covered.has(d))) continue;
    accepted.push(x);
  }
  return accepted
    .slice(0, max)
    .map((x) => {
      const { a, c, d } = x.table;
      return {
        id: `pista|${x.outcome}|${x.factorId}|${x.window}`,
        outcome: x.outcome,
        factorId: x.factorId,
        statement: `${a} de tus ${x.episodes} ${outcomePlural(x.outcome)} llegaron ${windowSentence(x.factor, x.window)}.`,
        contrast: `Los días sin eso, pasó en ${c} de ${c + d}.`,
      };
    });
}

export interface ExperimentResult {
  outcome: string;
  before: { days: number; episodes: number; rate: number };
  during: { days: number; episodes: number; rate: number; adherence: number };
  /** Diferencia de puntos porcentuales (negativo = menos episodios durante). */
  change: number;
  enoughData: boolean;
}

/** Compara la frecuencia del síntoma en los N días antes del experimento vs. los días cumplidos durante. */
export function experimentResult(entries: Entry[], startKey: string, durationDays: number, adherence: Record<string, boolean>, outcome: string): ExperimentResult {
  const daysAll = recordedDays(entries);
  const symptomDays = new Set(allEvents(entries).filter((e) => e.type === 'symptom' && e.data.name === outcome && e.occurred_at).map((e) => dayKey(e.occurred_at!)));
  const start = parseISO(`${startKey}T00:00:00`);
  const keys = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => dayKey(subDays(start, -(from + i))));
  const beforeKeys = keys(-durationDays, 0).filter((k) => daysAll.has(k));
  const duringKeys = keys(0, durationDays).filter((k) => daysAll.has(k));
  const adhered = duringKeys.filter((k) => adherence[k]);
  const rate = (ks: string[]) => (ks.length ? ks.filter((k) => symptomDays.has(k)).length / ks.length : 0);
  const before = { days: beforeKeys.length, episodes: beforeKeys.filter((k) => symptomDays.has(k)).length, rate: rate(beforeKeys) };
  const during = { days: duringKeys.length, episodes: duringKeys.filter((k) => symptomDays.has(k)).length, rate: rate(duringKeys), adherence: duringKeys.length ? adhered.length / duringKeys.length : 0 };
  return { outcome, before, during, change: during.rate - before.rate, enoughData: before.days >= 5 && during.days >= 5 };
}
