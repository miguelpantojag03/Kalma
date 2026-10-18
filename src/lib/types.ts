export type EventType =
  | 'symptom' | 'food' | 'drink' | 'medication' | 'sleep' | 'activity'
  | 'mood' | 'stress' | 'menstrual' | 'bowel' | 'water' | 'note';

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  symptom: 'Síntoma',
  food: 'Comida',
  drink: 'Bebida',
  medication: 'Medicamento',
  sleep: 'Sueño',
  activity: 'Actividad',
  mood: 'Ánimo',
  stress: 'Estrés',
  menstrual: 'Ciclo menstrual',
  bowel: 'Digestión',
  water: 'Agua',
  note: 'Nota',
};

export type PatternLevel = 'possible' | 'probable' | 'strong';

export const PATTERN_LEVEL_LABEL: Record<PatternLevel, string> = {
  possible: 'Posible',
  probable: 'Probable',
  strong: 'Fuerte',
};

/** Por debajo de este umbral, la extracción se marca con "¿Es correcto?". */
export const LOW_CONFIDENCE = 0.6;
