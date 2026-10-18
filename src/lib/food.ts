/**
 * Diario de comidas: se arma con los eventos `food` y `drink` que ya se registran por voz, texto,
 * foto o check-in. No cuenta calorías ni califica comidas como "buenas" o "malas": muestra qué
 * comiste y cuándo, que es lo que sirve para encontrar patrones y llevar a consulta.
 */
import { subDays } from 'date-fns';
import { dayKey } from './dates';
import type { Entry, StoredEvent } from './schema';
import { eventsByDay } from './selectors';

export type Meal = 'breakfast' | 'lunch' | 'snack' | 'dinner';
export const MEAL_ORDER: Meal[] = ['breakfast', 'lunch', 'snack', 'dinner'];
export const MEAL_LABEL: Record<Meal, string> = { breakfast: 'Desayuno', lunch: 'Almuerzo', snack: 'Onces', dinner: 'Comida' };

type FoodEvent = Extract<StoredEvent, { type: 'food' | 'drink' }>;
const isFood = (e: StoredEvent): e is FoodEvent => e.type === 'food' || e.type === 'drink';

/** Comida del día según lo dicho, o por la hora si no se dijo ("a las 7" → desayuno). */
export function mealOf(e: FoodEvent): Meal {
  if (e.data.meal) return e.data.meal;
  const h = e.occurred_at ? new Date(e.occurred_at).getHours() : 12;
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

export function mealsForDay(entries: Entry[], key: string): Record<Meal, FoodEvent[]> {
  const out: Record<Meal, FoodEvent[]> = { breakfast: [], lunch: [], snack: [], dinner: [] };
  for (const e of eventsByDay(entries).get(key) ?? []) if (isFood(e)) out[mealOf(e)].push(e);
  return out;
}

export interface WeekFood {
  /** Días de los últimos 7 con registro de comida. */
  daysWithFood: number;
  /** Categoría → días de la semana en que apareció. */
  categoryDays: { category: string; days: number }[];
  /** Días con registro de comida pero sin desayuno anotado. */
  noBreakfastDays: number;
  /** Promedio de vasos de agua en los días que se anotó. null si no se anotó. */
  waterAvg: number | null;
  /** Días con cafeína después de las 2 p. m. */
  lateCaffeineDays: number;
}

export function weekFood(entries: Entry[], now = new Date()): WeekFood {
  const byDay = eventsByDay(entries);
  const cats = new Map<string, number>();
  let daysWithFood = 0;
  let noBreakfastDays = 0;
  let lateCaffeineDays = 0;
  const water: number[] = [];
  for (let i = 0; i < 7; i++) {
    const evs = byDay.get(dayKey(subDays(now, i))) ?? [];
    const foods = evs.filter(isFood);
    for (const e of evs) if (e.type === 'water') water.push(e.data.glasses);
    if (!foods.length) continue;
    daysWithFood++;
    if (!foods.some((f) => mealOf(f) === 'breakfast')) noBreakfastDays++;
    if (foods.some((f) => f.data.categories.includes('cafeína') && f.occurred_at && new Date(f.occurred_at).getHours() >= 14)) lateCaffeineDays++;
    for (const c of new Set(foods.flatMap((f) => f.data.categories))) cats.set(c, (cats.get(c) ?? 0) + 1);
  }
  return {
    daysWithFood,
    categoryDays: [...cats].map(([category, days]) => ({ category, days })).sort((a, b) => b.days - a.days),
    noBreakfastDays,
    waterAvg: water.length ? water.reduce((a, b) => a + b, 0) / water.length : null,
    lateCaffeineDays,
  };
}
