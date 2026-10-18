/**
 * Ciclo menstrual (opcional: solo si la persona activa "Registrar mi ciclo"; Kalma no supone el
 * género de nadie). Se calcula a partir de los eventos `menstrual` (por voz: "me llegó el periodo",
 * o desde el check-in / la pantalla Mi ciclo).
 *
 * Seguridad: la fecha del próximo periodo es una ESTIMACIÓN por promedio. No sirve como método
 * anticonceptivo ni para buscar embarazo, y así se dice en la interfaz.
 */
import { addDays, differenceInCalendarDays } from 'date-fns';
import { dayKey, fromDayKey } from './dates';
import type { Entry } from './schema';
import { allEvents, eventsByDay } from './selectors';

export const DEFAULT_CYCLE = 28;
export const DEFAULT_PERIOD = 5;
/** Días sin registro que todavía cuentan como el mismo periodo (alguien olvidó anotar un día). */
const MAX_GAP = 2;

export interface Period {
  start: string;
  end: string;
  days: number;
}

/** Días con periodo registrado (claves "yyyy-MM-dd"). */
export function periodDays(entries: Entry[]): string[] {
  const days = new Set<string>();
  for (const e of allEvents(entries)) if (e.type === 'menstrual' && e.occurred_at) days.add(dayKey(e.occurred_at));
  return [...days].sort();
}

/** Agrupa los días en periodos (consecutivos, tolerando huecos de hasta 2 días). */
export function periods(entries: Entry[]): Period[] {
  const out: Period[] = [];
  for (const key of periodDays(entries)) {
    const last = out[out.length - 1];
    if (last && differenceInCalendarDays(fromDayKey(key), fromDayKey(last.end)) <= MAX_GAP + 1) {
      last.end = key;
      last.days = differenceInCalendarDays(fromDayKey(key), fromDayKey(last.start)) + 1;
    } else {
      out.push({ start: key, end: key, days: 1 });
    }
  }
  return out;
}

export interface CycleSummary {
  periods: Period[];
  /** Duración promedio del ciclo (de un inicio al siguiente). */
  cycleLength: number;
  /** true si no hay dos ciclos completos y se usa el valor por defecto (28). */
  estimatedLength: boolean;
  periodLength: number;
  /** Día del ciclo de hoy (1 = primer día del último periodo). null sin datos. */
  cycleDay: number | null;
  /** Hoy hay periodo (registrado hoy o ayer, dentro de su duración habitual). */
  inPeriod: boolean;
  nextStart: string | null;
  daysUntilNext: number | null;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function cycleSummary(entries: Entry[], today = new Date()): CycleSummary {
  const ps = periods(entries);
  const lengths = ps
    .slice(1)
    .map((p, i) => differenceInCalendarDays(fromDayKey(p.start), fromDayKey(ps[i]!.start)))
    .filter((d) => d >= 15 && d <= 60); // ciclos imposibles = datos incompletos, no se promedian
  const cycleLength = lengths.length ? Math.round(avg(lengths)) : DEFAULT_CYCLE;
  const periodLength = ps.length ? Math.max(1, Math.round(avg(ps.map((p) => p.days)))) : DEFAULT_PERIOD;
  const last = ps[ps.length - 1];
  if (!last) {
    return { periods: ps, cycleLength, estimatedLength: true, periodLength, cycleDay: null, inPeriod: false, nextStart: null, daysUntilNext: null };
  }
  const cycleDay = differenceInCalendarDays(today, fromDayKey(last.start)) + 1;
  const sinceEnd = differenceInCalendarDays(today, fromDayKey(last.end));
  const inPeriod = sinceEnd >= 0 && sinceEnd <= 1 && cycleDay <= periodLength + 2;
  const next = addDays(fromDayKey(last.start), cycleLength);
  return {
    periods: ps,
    cycleLength,
    estimatedLength: lengths.length === 0,
    periodLength,
    cycleDay,
    inPeriod,
    nextStart: dayKey(next),
    daysUntilNext: differenceInCalendarDays(next, today),
  };
}

/**
 * Cuántos días con un síntoma cayeron en la ventana perimenstrual (2 días antes a 3 días después del
 * inicio del periodo, como la describe la clasificación internacional de cefaleas). Es una
 * descripción, no una conclusión: la pantalla lo muestra junto a "coméntalo con tu médico".
 */
export function symptomsAroundPeriod(entries: Entry[], symptom: string): { inWindow: number; total: number } {
  const starts = periods(entries).map((p) => fromDayKey(p.start));
  let inWindow = 0;
  let total = 0;
  for (const [key, evs] of eventsByDay(entries)) {
    if (!evs.some((e) => e.type === 'symptom' && e.data.name.toLowerCase() === symptom)) continue;
    total++;
    const d = fromDayKey(key);
    if (starts.some((s) => { const diff = differenceInCalendarDays(d, s); return diff >= -2 && diff <= 3; })) inWindow++;
  }
  return { inWindow, total };
}
