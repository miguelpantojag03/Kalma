/**
 * Check-in nocturno: 3–5 preguntas con chips, adaptadas a lo que ya se registró hoy.
 * Nunca pregunta lo que ya sabe (Nielsen #6: reconocer antes que recordar, y respeto por el tiempo).
 */
import type { ExtractedEvent, StoredEvent } from './schema';

export interface CheckinOption {
  label: string;
  /** Eventos que genera esta respuesta (con la hora del check-in). */
  build: (at: string) => ExtractedEvent[];
}

export interface CheckinQuestion {
  id: string;
  question: string;
  options: CheckinOption[];
}

const ev = <T extends ExtractedEvent['type']>(type: T, at: string, source: string, data: Extract<ExtractedEvent, { type: T }>['data']) =>
  ({ type, occurred_at: at, occurred_at_precision: 'part_of_day', confidence: 1, source_text: source, data }) as Extract<ExtractedEvent, { type: T }>;

const sleepQ: CheckinQuestion = {
  id: 'sleep',
  question: '¿Cuántas horas dormiste anoche?',
  options: [
    { label: 'Menos de 5', h: 4.5 }, { label: '5 a 6', h: 5.5 }, { label: '6 a 7', h: 6.5 }, { label: '7 a 8', h: 7.5 }, { label: 'Más de 8', h: 8.5 },
  ].map(({ label, h }) => ({
    label,
    // El sueño de anoche se ubica en la mañana de hoy (al despertar)
    build: (at: string) => {
      const d = new Date(at);
      d.setHours(6, 30, 0, 0);
      return [ev('sleep', d.toISOString(), `dormí ${label.toLowerCase()} horas`, { hours: h, quality_1_5: null })];
    },
  })),
};

const level = (id: 'stress' | 'mood', question: string, opts: [string, number][]): CheckinQuestion => ({
  id,
  question,
  options: opts.map(([label, v]) => ({ label, build: (at) => [ev(id, at, `${id === 'stress' ? 'estrés' : 'ánimo'}: ${label.toLowerCase()}`, { level_0_10: v })] })),
});

const waterQ: CheckinQuestion = {
  id: 'water',
  question: '¿Cuánta agua tomaste hoy?',
  options: [['1 a 3 vasos', 2], ['4 a 6 vasos', 5], ['7 o más', 8]].map(([label, g]) => ({
    label: label as string,
    build: (at: string) => [ev('water', at, String(label), { glasses: g as number })],
  })),
};

function symptomFollowUp(name: string): CheckinQuestion {
  const label = name === 'molestia digestiva' ? 'la molestia digestiva' : `el ${name}`;
  return {
    id: 'symptom-followup',
    question: `¿Cómo sigue ${label}?`,
    options: [
      { label: 'Ya se me pasó', build: () => [] },
      { label: 'Mejor', build: () => [] },
      { label: 'Igual', build: (at) => [ev('note', at, `${name}: sigue igual en la noche`, { text: `${name}: sigue igual en la noche` })] },
      { label: 'Peor', build: (at) => [ev('note', at, `${name}: empeoró en la noche`, { text: `${name}: empeoró en la noche` })] },
    ],
  };
}

const missedSymptomQ: CheckinQuestion = {
  id: 'missed-symptom',
  question: '¿Tuviste algún síntoma que no anotaste?',
  options: [
    { label: 'No, ninguno', build: () => [] },
    ...['Dolor de cabeza', 'Molestia digestiva', 'Náuseas'].map((s) => ({
      label: s,
      build: (at: string) => [ev('symptom', at, `tuve ${s.toLowerCase()}`, { name: s.toLowerCase(), body_location: null, side: null, intensity_0_10: null, intensity_inferred: false, character: null, duration_minutes: null })],
    })),
  ],
};

/** Solo si la persona activó "Registrar mi ciclo" (y no lo anotó ya hoy). */
const periodQ: CheckinQuestion = {
  id: 'period',
  question: '¿Tienes el periodo hoy?',
  options: [
    { label: 'Sí', build: (at) => [ev('menstrual', at, 'tengo el periodo', { flow: null })] },
    { label: 'No', build: () => [] },
  ],
};

/** Arma las preguntas de hoy según lo registrado. Siempre entre 3 y 5. */
export function buildCheckin(todayEvents: StoredEvent[], opts: { tracksCycle?: boolean } = {}): CheckinQuestion[] {
  const qs: CheckinQuestion[] = [];
  const has = (t: StoredEvent['type']) => todayEvents.some((e) => e.type === t);
  const symptoms = todayEvents.filter((e): e is Extract<StoredEvent, { type: 'symptom' }> => e.type === 'symptom');

  if (!has('sleep')) qs.push(sleepQ);
  if (symptoms.length > 0) qs.push(symptomFollowUp(symptoms[symptoms.length - 1]!.data.name));
  else qs.push(missedSymptomQ);
  if (opts.tracksCycle && !has('menstrual')) qs.push(periodQ);
  if (!has('stress')) qs.push(level('stress', '¿Cuánto estrés tuviste hoy?', [['Poco', 2], ['Algo', 5], ['Mucho', 8]]));
  if (!has('mood')) qs.push(level('mood', '¿Cómo estuvo tu ánimo?', [['Bajo', 3], ['Normal', 6], ['Bien', 8]]));
  if (!has('water')) qs.push(waterQ);

  return qs.slice(0, 5);
}
