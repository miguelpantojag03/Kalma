/**
 * Convierte un evento guardado en el texto que muestra una EventCard (título, detalle, intensidad).
 * Lenguaje cotidiano, sin tecnicismos.
 */
import type { StoredEvent } from './schema';

const RELIEF: Record<string, string> = { full: 'Te alivió', partial: 'Te alivió un poco', none: 'No te alivió', unknown: 'Alivio sin anotar' };
const MEAL: Record<string, string> = { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Comida', snack: 'Onces' };
const SIDE: Record<string, string> = { left: 'lado izquierdo', right: 'lado derecho', both: 'ambos lados', center: 'centro' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface EventDescription {
  title: string;
  detail?: string;
  intensity?: number;
}

export function describeEvent(e: StoredEvent): EventDescription {
  switch (e.type) {
    case 'symptom':
      return {
        title: cap(e.data.name),
        detail: [e.data.side ? SIDE[e.data.side] : e.data.body_location, e.data.character].filter(Boolean).join(' · ') || undefined,
        intensity: e.data.intensity_0_10 ?? undefined,
      };
    case 'food':
    case 'drink':
      return {
        title: e.data.name,
        detail: [e.data.meal ? MEAL[e.data.meal] : null, e.data.quantity, e.data.categories.slice(0, 2).join(', ')].filter(Boolean).join(' · ') || undefined,
      };
    case 'medication':
      return {
        title: e.data.name,
        detail: [e.data.taken_for ? `Para ${e.data.taken_for}` : null, e.data.relief ? RELIEF[e.data.relief] : null].filter(Boolean).join(' · ') || undefined,
      };
    case 'sleep':
      return {
        title: `${String(e.data.hours).replace('.', ',')} h de sueño`,
        detail: e.data.quality_1_5 ? `Calidad ${e.data.quality_1_5} de 5` : undefined,
      };
    case 'stress':
      return { title: `Estrés ${e.data.level_0_10} de 10` };
    case 'mood':
      return { title: `Ánimo ${e.data.level_0_10} de 10` };
    case 'activity':
      return { title: cap(e.data.name), detail: e.data.duration_minutes ? `${e.data.duration_minutes} min` : undefined };
    case 'water':
      return { title: `${e.data.glasses} ${e.data.glasses === 1 ? 'vaso' : 'vasos'} de agua` };
    case 'bowel':
      return { title: cap(e.data.description) };
    case 'menstrual':
      return { title: 'Periodo', detail: e.data.flow ?? undefined };
    case 'note':
      return { title: e.data.text };
  }
}
