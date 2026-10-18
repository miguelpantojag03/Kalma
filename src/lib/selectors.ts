/**
 * Lecturas derivadas de los registros. Funciones puras (sin store) para poder probarlas
 * y reutilizarlas en Hoy, Calendario, Patrones y el reporte.
 */
import { subDays, startOfDay } from 'date-fns';
import { dayKey } from './dates';
import type { Entry, StoredEvent } from './schema';

/** Mínimo de días con registro para el primer análisis de patrones (brief §7). */
export const DAYS_FOR_ANALYSIS = 14;

export const eventTime = (e: StoredEvent, entry?: Entry) => e.occurred_at ?? entry?.recordedAt ?? null;

export function allEvents(entries: Entry[]): StoredEvent[] {
  return entries.flatMap((en) => en.events.map((e) => (e.occurred_at ? e : { ...e, occurred_at: en.recordedAt })));
}

/** Eventos agrupados por día local, ordenados por hora. */
export function eventsByDay(entries: Entry[]): Map<string, StoredEvent[]> {
  const map = new Map<string, StoredEvent[]>();
  for (const e of allEvents(entries)) {
    const k = dayKey(e.occurred_at!);
    const list = map.get(k) ?? [];
    list.push(e);
    map.set(k, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.occurred_at!.localeCompare(b.occurred_at!));
  return map;
}

export function recordedDays(entries: Entry[]): Set<string> {
  return new Set(entries.map((e) => dayKey(e.recordedAt)));
}

/**
 * Estado de un día para el calendario:
 *  - número → intensidad máxima de síntomas
 *  - undefined → registró, pero sin síntomas
 *  - null → no hay registro ese día
 */
export function dayStatus(byDay: Map<string, StoredEvent[]>, key: string, symptomFilter?: string): number | undefined | null {
  const events = byDay.get(key);
  if (!events || events.length === 0) return null;
  let max: number | undefined;
  for (const e of events) {
    if (e.type !== 'symptom') continue;
    if (symptomFilter && e.data.name !== symptomFilter) continue;
    const v = e.data.intensity_0_10;
    if (v !== null && (max === undefined || v > max)) max = v;
  }
  return max;
}

export interface AnalysisProgress {
  days: number;
  needed: number;
  ready: boolean;
}

/** "6 de 14 días" — progreso hacia el primer análisis (efecto de gradiente de objetivo). */
export function analysisProgress(entries: Entry[]): AnalysisProgress {
  const days = recordedDays(entries).size;
  return { days, needed: DAYS_FOR_ANALYSIS, ready: days >= DAYS_FOR_ANALYSIS };
}

/**
 * "Racha sin castigo": cuántos de los últimos 7 días registraste. Nunca se "pierde";
 * un día sin registro simplemente no suma (tono del brief: nada de "perdiste tu racha").
 */
export function daysThisWeek(entries: Entry[], now = new Date()): number {
  const days = recordedDays(entries);
  let n = 0;
  for (let i = 0; i < 7; i++) if (days.has(dayKey(subDays(startOfDay(now), i)))) n++;
  return n;
}

export function symptomNames(entries: Entry[]): string[] {
  const names = new Set<string>();
  for (const e of allEvents(entries)) if (e.type === 'symptom') names.add(e.data.name);
  return [...names].sort();
}
