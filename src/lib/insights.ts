/**
 * Resúmenes que Kalma muestra sin que se los pidan: la semana en números y el aviso de uso
 * frecuente de analgésicos. Se describen datos; nunca se dice qué hacer con un medicamento.
 */
import { subDays } from 'date-fns';
import { dayKey } from './dates';
import type { Entry } from './schema';
import { eventsByDay } from './selectors';

export interface WeekSummary {
  symptomDays: number;
  prevSymptomDays: number;
  /** Horas de sueño promedio de la semana (null si no se anotó). */
  avgSleep: number | null;
  recordedDays: number;
}

export function weekSummary(entries: Entry[], now = new Date()): WeekSummary {
  const byDay = eventsByDay(entries);
  const range = (from: number) => Array.from({ length: 7 }, (_, i) => byDay.get(dayKey(subDays(now, from + i))) ?? []);
  const thisWeek = range(0);
  const prevWeek = range(7);
  const sleep = thisWeek.flat().filter((e) => e.type === 'sleep').map((e) => (e.type === 'sleep' ? e.data.hours : 0));
  const hasSymptom = (evs: (typeof thisWeek)[number]) => evs.some((e) => e.type === 'symptom');
  return {
    symptomDays: thisWeek.filter(hasSymptom).length,
    prevSymptomDays: prevWeek.filter(hasSymptom).length,
    avgSleep: sleep.length ? sleep.reduce((a, b) => a + b, 0) / sleep.length : null,
    recordedDays: thisWeek.filter((d) => d.length > 0).length,
  };
}

/** Frase neutra para comparar semanas (sin "¡mejoraste!" ni "empeoraste"). */
export function weekComparison(s: WeekSummary): string {
  const days = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
  if (s.symptomDays === 0) return s.prevSymptomDays > 0 ? `Esta semana no anotaste síntomas (la anterior, ${days(s.prevSymptomDays)}).` : 'Esta semana no anotaste síntomas.';
  return `Esta semana: ${days(s.symptomDays)} con síntomas (la anterior, ${days(s.prevSymptomDays)}).`;
}

const TRIPTAN = /triptan|sumatript|naratript|zolmitript|rizatript|eletript|almotript/i;

export interface MedicationUse {
  /** Días de los últimos 30 con algún medicamento para el dolor. */
  days: number;
  triptanDays: number;
  /** Se cruza el umbral en que la clasificación de cefaleas habla de uso excesivo. */
  frequent: boolean;
}

/**
 * Umbrales de la clasificación internacional de cefaleas (ICHD-3) para cefalea por uso excesivo
 * de medicación: triptanes ≥ 10 días al mes, analgésicos simples ≥ 15. Kalma solo muestra el número
 * y sugiere comentarlo; no diagnostica la cefalea ni sugiere dejar el medicamento.
 */
export function medicationUse(entries: Entry[], now = new Date()): MedicationUse {
  const byDay = eventsByDay(entries);
  let days = 0;
  let triptanDays = 0;
  for (let i = 0; i < 30; i++) {
    const meds = (byDay.get(dayKey(subDays(now, i))) ?? []).filter((e) => e.type === 'medication');
    if (!meds.length) continue;
    days++;
    if (meds.some((m) => m.type === 'medication' && TRIPTAN.test(`${m.data.name} ${m.data.generic_name ?? ''}`))) triptanDays++;
  }
  return { days, triptanDays, frequent: triptanDays >= 10 || days >= 15 };
}
