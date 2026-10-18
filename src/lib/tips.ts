/**
 * Consejos de alimentación y hábitos. Reglas de seguridad (igual que los experimentos, D59):
 * - Son ideas generales de bienestar, no un plan de alimentación ni una dieta.
 * - Nunca: calorías, suplementos, ayunos, ni "deja de comer X". Para cambios grandes, a quién preguntar.
 * - Los personalizados nacen de los datos de la persona y se dicen como coincidencia, no como causa.
 */
import { outcomePlural, type Pattern } from './patterns';
import type { WeekFood } from './food';

export type TipTopic = 'migraña' | 'digestión' | 'general';

export interface Tip {
  id: string;
  title: string;
  text: string;
  topic: TipTopic;
  /** Por qué se muestra (solo en los personalizados). */
  reason?: string;
  /** Patrón del que sale (para ofrecer un experimento con ese hábito). */
  patternId?: string;
}

export const GENERAL_TIPS: Tip[] = [
  { id: 'horarios', topic: 'migraña', title: 'Comer a horas parecidas', text: 'Saltarse comidas o pasar muchas horas sin comer es algo que muchas personas con migraña notan antes de un dolor. Tener horarios parecidos cada día puede ayudar.' },
  { id: 'agua', topic: 'general', title: 'Agua durante el día', text: 'Tener una botella a la vista ayuda a acordarte. Tomar agua poco a poco durante el día suele sentar mejor que mucha de una vez.' },
  { id: 'cafeina', topic: 'migraña', title: 'Cafeína parecida cada día', text: 'Tanto tomar más tinto de lo normal como dejarlo de golpe puede notarse. Tomarlo temprano también ayuda a dormir mejor.' },
  { id: 'despacio', topic: 'digestión', title: 'Comer con calma', text: 'Comer despacio y masticar bien ayuda a la digestión. Si puedes, almuerza sin pantalla.' },
  { id: 'cena', topic: 'digestión', title: 'Cenar un rato antes de dormir', text: 'Dejar unas 2 o 3 horas entre la comida y acostarte suele ayudar si sientes acidez o pesadez en la noche.' },
  { id: 'fibra', topic: 'digestión', title: 'Frutas, verduras y granos', text: 'Si quieres comer más fibra, hazlo poco a poco y con agua: un cambio brusco puede inflamar.' },
  { id: 'alcohol', topic: 'migraña', title: 'Notar el alcohol', text: 'Algunas personas notan dolor de cabeza después de tomar, sobre todo vino tinto o aguardiente. Anótalo cuando tomes para ver si te pasa a ti.' },
  { id: 'detonantes', topic: 'migraña', title: 'Los detonantes cambian de persona a persona', text: 'El chocolate, el queso maduro o los embutidos se mencionan mucho, pero no a todos les afectan. Tus registros dirán qué pasa contigo.' },
  { id: 'anotar', topic: 'general', title: 'Anotar lo nuevo', text: 'Cuando comas algo distinto (un restaurante, un plato nuevo), cuéntaselo a Kalma: es donde más se aprende.' },
  { id: 'nutricionista', topic: 'general', title: 'Antes de quitar un alimento', text: 'No elimines grupos de alimentos por tu cuenta. Si quieres probar, haz un experimento corto en Kalma y habla con tu médico o nutricionista.' },
];

export const TIPS_NOTE = 'Ideas generales de bienestar, no un plan de alimentación. Para cambios grandes, habla con tu médico o con un nutricionista.';

const FOOD_FACTOR = /^cat-/;

/** Consejos que salen de los datos de la persona (máximo 3, los más útiles primero). */
export function personalTips(patterns: Pattern[], week: WeekFood): Tip[] {
  const out: Tip[] = [];
  for (const p of patterns.filter((x) => FOOD_FACTOR.test(x.factorId)).slice(0, 2)) {
    out.push({
      id: `patron-${p.id}`,
      topic: p.outcome.includes('cabeza') ? 'migraña' : 'digestión',
      title: `${p.factorShort} y tus ${outcomePlural(p.outcome)}`,
      text: `Kalma notó que ${p.statement.charAt(0).toLowerCase()}${p.statement.slice(1)} Es una coincidencia en tus datos, no una prueba. Una forma segura de comprobarlo es un experimento corto.`,
      reason: 'Por un patrón encontrado',
      patternId: p.id,
    });
  }
  if (week.daysWithFood >= 3 && week.noBreakfastDays >= 3) {
    out.push({ ...GENERAL_TIPS[0]!, id: 'p-horarios', reason: `Esta semana hubo ${week.noBreakfastDays} días sin desayuno anotado` });
  }
  if (week.waterAvg !== null && week.waterAvg < 5) {
    out.push({ ...GENERAL_TIPS[1]!, id: 'p-agua', reason: `Esta semana anotaste unos ${Math.round(week.waterAvg)} vasos de agua al día` });
  }
  if (week.lateCaffeineDays >= 3) {
    out.push({ ...GENERAL_TIPS[2]!, id: 'p-cafeina', reason: `${week.lateCaffeineDays} días con cafeína después de las 2 p. m.` });
  }
  return out.slice(0, 3);
}

/** Consejo del día (cambia cada día, estable durante el día). */
export function tipOfTheDay(date = new Date()): Tip {
  const n = Math.floor(date.getTime() / 86_400_000);
  return GENERAL_TIPS[n % GENERAL_TIPS.length]!;
}
