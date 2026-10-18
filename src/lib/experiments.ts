/**
 * Experimentos personales: cambiar UNA cosa durante 7, 14 o 21 días y comparar el síntoma antes vs. durante.
 *
 * Regla de seguridad (brief §6.7): Kalma NUNCA sugiere suspender, bajar ni cambiar medicamentos.
 * Las plantillas solo proponen hábitos; y si la persona escribe un experimento que toca su tratamiento,
 * se le pide hablarlo primero con su médico y no se puede crear.
 */
import { addDays, differenceInCalendarDays } from 'date-fns';
import { dayKey, fromDayKey } from './dates';
import type { Experiment } from './schema';

export interface ExperimentTemplate {
  factorId: string;
  title: string;
  /** Cómo saber si se cumplió (se muestra al registrar la adherencia). */
  howTo: string;
}

/** Plantillas de hábitos según el factor del patrón (nunca medicamentos). */
export const TEMPLATES: ExperimentTemplate[] = [
  { factorId: 'sleep-short', title: 'Dormir al menos 7 horas', howTo: 'Acostarte a una hora fija y dejar el celular 30 minutos antes.' },
  { factorId: 'cat-lácteo', title: 'Evitar los lácteos', howTo: 'Sin leche, queso, yogur, perico ni pandebono. Puedes usar bebidas vegetales.' },
  { factorId: 'cat-cafeína', title: 'Máximo 2 tintos, ninguno después de las 2 p. m.', howTo: 'Cuenta también la gaseosa y el té negro.' },
  { factorId: 'cat-frito', title: 'Evitar los fritos', howTo: 'Prefiere asado, cocido o al horno.' },
  { factorId: 'cat-alcohol', title: 'No tomar alcohol', howTo: 'Ni cerveza ni aguardiente durante el experimento.' },
  { factorId: 'stress-high', title: '10 minutos de pausa activa al día', howTo: 'Respiración, estiramientos o caminar sin pantalla.' },
  { factorId: 'water-low', title: 'Tomar 6 vasos de agua al día', howTo: 'Ten una botella a la vista.' },
  { factorId: 'mood-low', title: 'Salir a caminar 20 minutos al día', howTo: 'Mejor con luz del día.' },
];

export const templateFor = (factorId: string | undefined) => TEMPLATES.find((t) => t.factorId === factorId);

/** Frases que implican cambiar el tratamiento: se bloquean y se remite al médico. */
const MED_CHANGE = /\b(dejar|suspender|parar|quitar|bajar|reducir|cambiar|no tomar|sin tomar|disminuir|aumentar|subir)\b.{0,40}\b(dolex|acetaminof\w*|paracetamol|ibuprof\w*|naprox\w*|buscapina|omeprazol|medicamento\w*|medicina\w*|pastilla\w*|pepa\w*|tratamiento|dosis|anticonceptiv\w*|triptan\w*|sumatript\w*)/i;

export function touchesMedication(text: string): boolean {
  const t = text.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return MED_CHANGE.test(t);
}

export const experimentEnd = (x: Pick<Experiment, 'startDate' | 'durationDays'>) => addDays(fromDayKey(x.startDate), x.durationDays - 1);

/** Día del experimento (1…N) para una fecha; 0 si aún no empieza; > N si ya terminó. */
export function experimentDay(x: Pick<Experiment, 'startDate'>, date = new Date()) {
  return differenceInCalendarDays(date, fromDayKey(x.startDate)) + 1;
}

/** Experimentos activos cuyo periodo ya pasó (se cierran solos al abrir la app). */
export function expiredIds(experiments: Experiment[], today = new Date()): string[] {
  return experiments.filter((x) => x.status === 'active' && experimentDay(x, today) > x.durationDays).map((x) => x.id);
}

/** Lista de días del experimento con su estado de adherencia. */
export function adherenceDays(x: Experiment, today = new Date()) {
  return Array.from({ length: x.durationDays }, (_, i) => {
    const key = dayKey(addDays(fromDayKey(x.startDate), i));
    const future = key > dayKey(today);
    return { key, index: i + 1, done: x.adherence[key], future };
  });
}

export function adherenceRate(x: Experiment) {
  const answered = Object.values(x.adherence);
  return answered.length ? answered.filter(Boolean).length / answered.length : 0;
}
