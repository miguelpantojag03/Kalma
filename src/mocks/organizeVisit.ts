/**
 * "Volví del médico" (IA simulada): organiza lo que la persona cuenta que le dijo su médico en
 * diagnóstico mencionado, medicamentos, indicaciones y próximos controles.
 *
 * Reglas: Kalma NO interpreta ni agrega nada; solo ordena lo dicho. El diagnóstico se presenta como
 * "lo que mencionó tu médico". Misma idea que extractEntry: una función con latencia simulada que
 * podría reemplazarse por un LLM detrás de un proxy.
 */
import { addDays, addMonths, addWeeks, format, setDate, setMonth } from 'date-fns';
import type { DoctorVisit } from '@/lib/schema';
import { MEDICATIONS, normalize } from './foodDictionary';

export type OrganizedVisit = Omit<DoctorVisit, 'id' | 'visitedAt' | 'doctor' | 'transcript'>;

const DIAGNOSES: [RegExp, string][] = [
  [/migrana cronica/, 'migraña crónica'],
  [/migrana (con|sin) aura/, 'migraña $1 aura'],
  [/migrana/, 'migraña'],
  [/cefalea tensional|dolor de cabeza tensional/, 'cefalea tensional'],
  [/colon irritable|intestino irritable|sii\b/, 'síndrome de intestino irritable'],
  [/gastritis/, 'gastritis'],
  [/reflujo/, 'reflujo'],
  [/intolerancia a la lactosa|intolerante a la lactosa/, 'intolerancia a la lactosa'],
  [/ansiedad/, 'ansiedad'],
];

const EXTRA_MEDS: [RegExp, string][] = [
  [/sumatriptan\w*/, 'Sumatriptán'],
  [/amitriptilin\w*/, 'Amitriptilina'],
  [/propranolol/, 'Propranolol'],
  [/topiramato/, 'Topiramato'],
  [/trimebutina/, 'Trimebutina'],
  [/simeticona/, 'Simeticona'],
  [/esomeprazol/, 'Esomeprazol'],
  [/magnesio/, 'Magnesio'],
];

const NUM: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, ocho: 8, quince: 15, treinta: 30 };
const toNum = (s: string) => NUM[s] ?? Number(s);
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function followUpDate(n: string, base: Date): string | null {
  const rel = n.match(/en (\d+|un|una|dos|tres|cuatro|seis|quince|treinta) (dia|dias|semana|semanas|mes|meses)/);
  if (rel) {
    const q = toNum(rel[1]!);
    const u = rel[2]!;
    const d = u.startsWith('dia') ? addDays(base, q) : u.startsWith('semana') ? addWeeks(base, q) : addMonths(base, q);
    return format(d, 'yyyy-MM-dd');
  }
  const abs = n.match(/el (\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/);
  if (abs) {
    let d = setDate(setMonth(base, MONTHS.indexOf(abs[2]!)), Number(abs[1]));
    if (d < base) d = addMonths(d, 12);
    return format(d, 'yyyy-MM-dd');
  }
  return null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function organizeVisitSync(text: string, base = new Date()): OrganizedVisit {
  const n = normalize(text);
  // Frases: por puntos, y también en ", que…" o " y tome / y evite / y vuelva…" (una indicación por frase)
  const sentences = text
    .split(/[.;\n]+|,\s*(?=y\s+que|que\s|me\s|tengo\s|debo\s|hay\s)|\s+y\s+(?=(?:que\s+)?(?:tome|tomar|evite|evitar|haga|hacer|duerma|dormir|vuelva|volver|camine|siga|seguir|lleve|anote|me\s+pidi[oó]))/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const diagnoses = [...new Set(DIAGNOSES.flatMap(([re, label]) => {
    const m = n.match(re);
    return m ? [label.replace('$1', m[1] ?? '')] : [];
  }))].filter((d, _, arr) => !(d === 'migraña' && arr.some((x) => x.startsWith('migraña ') && x !== 'migraña')));

  const medications: OrganizedVisit['medications'] = [];
  const medDefs = [
    ...MEDICATIONS.map((m) => ({ re: new RegExp(`\\b(${m.says.join('|')})\\b`), name: m.label })),
    ...EXTRA_MEDS.map(([re, name]) => ({ re, name })),
  ];
  for (const s of sentences) {
    const ns = normalize(s);
    for (const m of medDefs) {
      if (!m.re.test(ns) || medications.some((x) => x.name === m.name)) continue;
      const dose = ns.match(/(\d+(?:[.,]\d+)?)\s?(mg|miligramos|g|gramos|ml)\b/);
      const freq = ns.match(/cada (\d+|ocho|doce|seis) horas|(una|dos|tres) veces al dia|en las noches|en la noche|antes de dormir|si (me )?(duele|da dolor)|cuando (me )?(duela|de el dolor)/);
      medications.push({
        name: m.name,
        dose: dose ? `${dose[1]!.replace(',', '.')} ${dose[2]!.startsWith('mili') ? 'mg' : dose[2]}` : null,
        // Se compara sin tildes, pero se muestra bien escrito
        frequency: freq ? freq[0].replace(/\bdia\b/, 'día') : null,
      });
    }
  }

  const followUps: OrganizedVisit['followUps'] = [];
  const instructions: string[] = [];
  for (const s of sentences) {
    const ns = normalize(s);
    if (/control|cita|volver|revision|seguimiento|examen|examenes|laboratorio/.test(ns) && /(en \d+|en (un|una|dos|tres|cuatro|seis|quince|treinta) )|el \d{1,2} de|proxim/.test(ns)) {
      followUps.push({ label: cap(s.replace(/^(y\s+)?(que\s+)?/i, '')), date: followUpDate(ns, base) });
      continue;
    }
    if (medDefs.some((m) => m.re.test(ns))) continue;
    if (/^(y\s+)?(que|debo|tengo que|hay que|evitar|no |me (dijo|recomendo|pidio) que|recomend)/.test(ns) || /\b(evitar|dormir|tomar agua|hacer ejercicio|caminar|llevar un diario|anotar|registrar)\b/.test(ns)) {
      const clean = s.replace(/^(y\s+)?(me (dijo|recomendó|recomendo|pidió|pidio) que\s+|que\s+)/i, '');
      if (clean.length > 3 && !DIAGNOSES.some(([re]) => re.test(normalize(clean)) && clean.split(' ').length < 6)) instructions.push(cap(clean));
    }
  }

  return { diagnoses, medications, instructions, followUps };
}

export async function organizeVisit(text: string, base = new Date(), latencyMs = 1100): Promise<OrganizedVisit> {
  if (latencyMs > 0) await new Promise((r) => setTimeout(r, latencyMs));
  return organizeVisitSync(text, base);
}

export const VISIT_EXAMPLES = [
  'La neuróloga me dijo que es migraña sin aura. Me mandó sumatriptán de 50 mg si me duele. Que duerma mínimo 7 horas y que siga llevando el diario. Control en un mes.',
  'El gastro me dijo que puede ser colon irritable. Que evite los lácteos dos semanas y tome trimebutina 200 mg tres veces al día. Me pidió exámenes y volver en 15 días.',
];
