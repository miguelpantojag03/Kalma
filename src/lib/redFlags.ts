/**
 * Detección de banderas rojas en cualquier registro (texto, voz o foto descrita).
 *
 * Criterio de diseño: ante la duda, AVISAR (un falso positivo cuesta un toque en "Ya estoy bien";
 * un falso negativo puede costar mucho más). Incluye variantes coloquiales colombianas.
 * Kalma no diagnostica: solo sugiere buscar atención y muestra la línea 123.
 */
import { normalize } from '@/mocks/foodDictionary';
import type { RED_FLAG_CATEGORIES } from './schema';

export type RedFlagCategory = (typeof RED_FLAG_CATEGORIES)[number];

interface Rule {
  category: RedFlagCategory;
  patterns: RegExp[];
}

/** Todas las expresiones se prueban sobre texto normalizado (minúsculas, sin tildes). */
const RULES: Rule[] = [
  {
    category: 'chest_pain',
    patterns: [
      /(dolor|duele|presion|opresion|apreta|aprieta|punzada|peso)\w*\s+(\w+\s+){0,3}(en el |el )?pecho/,
      /pecho\s+(\w+\s+){0,3}(duele|dolor|apretado|presion|opresion)/,
      /me (esta )?doliendo el pecho/,
    ],
  },
  {
    category: 'breathing',
    patterns: [
      /(me )?cuesta (mucho )?respirar/, /no (puedo|logro) respirar/, /dificultad (para|al) respirar/,
      /me falta (el )?aire/, /me ahogo|ahogando|ahogandome/, /no me entra (el )?aire/, /respiro con dificultad/,
    ],
  },
  {
    category: 'thunderclap_headache',
    patterns: [
      /(el )?peor dolor de cabeza de (mi|toda mi) vida/,
      /dolor de cabeza (\w+\s+){0,2}(subito|repentino|de repente|como un trueno|como una explosion)/,
      /de (un momento a otro|repente|golpe) (\w+\s+){0,3}dolor de cabeza (horrible|terrible|insoportable|durisimo)/,
    ],
  },
  {
    category: 'meningitis_signs',
    patterns: [/(cuello|nuca) (rigido|tieso|duro)/, /fiebre (\w+\s+){0,4}(no puedo (mover|doblar|bajar) (el )?(cuello|cabeza)|cuello rigido)/],
  },
  {
    category: 'stroke_signs',
    patterns: [
      /(se me )?(durmio|adormecio|adormecid\w*|entumi\w*|paraliz\w*|debil\w*|no puedo mover) (\w+\s+){0,3}(medio cuerpo|un lado|lado (izquierdo|derecho)|el brazo|la pierna|la cara)/,
      /(cara|boca) (torcida|caida|chueca)/, /se me (cayo|torcio) (la cara|la boca)/,
      /no (puedo|me salen las palabras|logro) (hablar|vocalizar)/, /(hablo|hablando) enredado|se me enreda la lengua|arrastro las palabras/,
    ],
  },
  {
    category: 'vision_loss',
    patterns: [/(perdi|deje de ver|se me fue) la vista/, /no veo (nada|de un ojo)/, /(quede|me quede) ciego/, /perdida (subita )?de (la )?vision/],
  },
  {
    category: 'fainting',
    patterns: [/me desmaye|desmayo|perdi (el )?conocimiento|perdi la conciencia|me privé|me prive|me fui de lado y cai/],
  },
  {
    category: 'seizure',
    patterns: [/convulsion|convulsione|convulsionando|ataque epileptico|me dio un ataque y temblaba/],
  },
  {
    category: 'gi_bleeding',
    patterns: [
      /vomit\w* (\w+\s+){0,2}sangre|vomito con sangre|devolvi sangre/,
      /(popo|caca|heces|materia fecal|deposicion|deposiciones) (\w+\s+){0,2}(negra|negras|como alquitran|con sangre)/,
      /sangre en (la )?(popo|caca|heces|deposicion)/,
    ],
  },
  {
    category: 'uncontrolled_bleeding',
    patterns: [/sangrado que no (para|se detiene)|no (me )?(para|deja) de sangrar|sangro mucho y no para/],
  },
  {
    category: 'acute_abdomen',
    patterns: [/dolor (de (estomago|barriga|abdomen)|abdominal) (\w+\s+){0,3}(subito|repentino|insoportable|horrible|el peor)/, /el peor dolor de (estomago|barriga) de mi vida/],
  },
  {
    category: 'anaphylaxis',
    patterns: [/(se me )?(hincharon|hinchan|inflamaron|inflaman) (los labios|la lengua|la garganta|la cara)/, /(labios|lengua|garganta) (hinchad\w*|inflamad\w*)/, /se me (esta )?cerrando la garganta/],
  },
  {
    category: 'pregnancy_bleeding',
    patterns: [/(embarazada|embarazo) (\w+\s+){0,5}(sangr\w*|manch\w*)/, /(sangr\w*|manch\w*) (\w+\s+){0,5}(embarazada|embarazo)/],
  },
  {
    category: 'self_harm',
    patterns: [
      /(hacerme|me quiero hacer|pienso en hacerme) dano/, /(quitarme|acabar con) (la|mi) vida/, /(no quiero|ya no quiero) (seguir )?(vivir|viviendo)/,
      /(me quiero|quisiera|quiero) morir/, /suicid\w*/, /cortarme|matarme/, /mejor (estaria|estar) muert[ao]/, /desaparecer para siempre/,
    ],
  },
];

export interface RedFlagResult {
  detected: boolean;
  categories: RedFlagCategory[];
  evidence: string | null;
  /** La variante de salud mental tiene una pantalla distinta (empática, líneas de ayuda). */
  kind: 'physical' | 'mental' | null;
}

export function detectRedFlags(text: string): RedFlagResult {
  const t = normalize(text);
  const categories: RedFlagCategory[] = [];
  let evidence: string | null = null;
  for (const rule of RULES) {
    for (const re of rule.patterns) {
      const m = t.match(re);
      if (m) {
        categories.push(rule.category);
        evidence ??= m[0];
        break;
      }
    }
  }
  if (categories.length === 0) return { detected: false, categories, evidence: null, kind: null };
  const onlyMental = categories.every((c) => c === 'self_harm');
  // Si hay riesgo físico y emocional a la vez, primero lo físico (123), la pantalla incluye también las líneas de ayuda.
  return { detected: true, categories, evidence, kind: onlyMental ? 'mental' : 'physical' };
}
