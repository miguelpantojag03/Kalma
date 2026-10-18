import { parseISO } from 'date-fns';
import { detectRedFlags } from '@/lib/redFlags';
import { applyFollowUpAnswer, extractEntry, extractEntrySync } from '../extractEntry';
import { SAMPLE_TRANSCRIPTS } from '../transcripts';

// Grabado a las 4:30 p. m. hora local
const recordedAt = new Date('2026-10-17T16:30:00').toISOString();
const x = (t: string) => extractEntrySync(t, { recordedAt });
const sample = (id: string) => SAMPLE_TRANSCRIPTS.find((s) => s.id === id)!.text;

describe('criterios de aceptación del brief', () => {
  it('"Me dolió la cabeza fuerte después del almuerzo, me tomé un dolex"', () => {
    const r = x('Me dolió la cabeza fuerte después del almuerzo, me tomé un dolex');
    const symptom = r.events.find((e) => e.type === 'symptom');
    const med = r.events.find((e) => e.type === 'medication');

    expect(symptom).toBeDefined();
    if (symptom?.type !== 'symptom') throw new Error();
    expect(symptom.data.name).toBe('dolor de cabeza');
    expect(symptom.data.intensity_0_10).toBeGreaterThanOrEqual(6);
    expect(symptom.data.intensity_0_10).toBeLessThanOrEqual(8);
    expect(symptom.data.intensity_inferred).toBe(true);
    expect(symptom.occurred_at_precision).toBe('part_of_day');
    expect(parseISO(symptom.occurred_at!).getHours()).toBeGreaterThanOrEqual(12); // tarde
    expect(parseISO(symptom.occurred_at!).getHours()).toBeLessThan(19);

    if (med?.type !== 'medication') throw new Error();
    expect(med.data.generic_name).toBe('acetaminofén');
    expect(med.data.taken_for).toBe('dolor de cabeza');

    expect(r.follow_up.question).toMatch(/alivi/i);
    expect(r.follow_up.target_event_index).toBe(r.events.indexOf(med));
    expect(r.red_flag.detected).toBe(false);
  });

  it('"Me duele el pecho y me cuesta respirar" dispara la bandera roja y NO hace preguntas', () => {
    const r = x('Me duele el pecho y me cuesta respirar');
    expect(r.red_flag.detected).toBe(true);
    expect(r.red_flag.categories).toEqual(expect.arrayContaining(['chest_pain', 'breathing']));
    expect(r.follow_up.question).toBeNull();
  });
});

describe('transparencia', () => {
  it('"lo que dijiste" conserva el texto original (con tildes)', () => {
    const r = x('Me dolió la cabeza fuerte después del almuerzo, me tomé un dolex');
    expect(r.events[0]!.source_text).toBe('Me dolió la cabeza fuerte después del almuerzo');
    expect(r.events[1]!.source_text).toBe('me tomé un dolex');
  });

  it('el dolor de pecho se puede guardar como síntoma si la persona dice que fue un error', () => {
    const r = x('Me duele el pecho y me cuesta respirar');
    const names = r.events.flatMap((e) => (e.type === 'symptom' ? [e.data.name] : []));
    expect(names).toEqual(expect.arrayContaining(['dolor en el pecho', 'dificultad para respirar']));
  });
});

describe('las 10 transcripciones de ejemplo', () => {
  it.each(SAMPLE_TRANSCRIPTS.map((s) => [s.id, s.text]))('%s cumple el esquema', async (_id, text) => {
    await expect(extractEntry(text, { recordedAt, latencyMs: 0 })).resolves.toBeDefined();
  });

  it('solo comida: changua (lácteo), almojábana y 2 tintos, sin pregunta', () => {
    const r = x(sample('solo-comida'));
    const names = r.events.map((e) => ('name' in e.data ? e.data.name : ''));
    expect(names).toEqual(expect.arrayContaining(['Changua', 'Almojábana', 'Tinto']));
    const tinto = r.events.find((e) => e.type === 'drink');
    expect(tinto?.type === 'drink' && tinto.data.quantity).toBe('2');
    expect(r.events.every((e) => e.type !== 'symptom')).toBe(true);
    expect(r.follow_up.question).toBeNull();
  });

  it('sueño y estrés: 5 h y estrés alto', () => {
    const r = x(sample('sueno-estres'));
    const sleep = r.events.find((e) => e.type === 'sleep');
    const stress = r.events.find((e) => e.type === 'stress');
    expect(sleep?.type === 'sleep' && sleep.data.hours).toBe(5);
    expect(stress?.type === 'stress' && stress.data.level_0_10).toBeGreaterThanOrEqual(7);
  });

  it('síntoma sin intensidad → pregunta "¿Qué tan fuerte…?" con chips', () => {
    const r = x(sample('sintoma-sin-intensidad'));
    expect(r.follow_up.question).toMatch(/qué tan fuerte/i);
    expect(r.follow_up.quick_replies).toEqual(['Leve', 'Moderado', 'Fuerte', 'Muy fuerte']);
    const updated = applyFollowUpAnswer(r, 'Fuerte');
    const s = updated[r.follow_up.target_event_index!]!;
    expect(s.type === 'symptom' && s.data.intensity_0_10).toBe(7);
  });

  it('frase ambigua → baja confianza', () => {
    const r = x(sample('ambigua'));
    expect(r.events.length).toBeGreaterThan(0);
    expect(r.events.every((e) => e.confidence < 0.6)).toBe(true);
  });

  it('texto no relacionado → sin eventos y con unparsed', () => {
    const r = x(sample('no-relacionado'));
    expect(r.events).toHaveLength(0);
    expect(r.unparsed).toBeTruthy();
    expect(r.red_flag.detected).toBe(false);
  });

  it('hora explícita "a las 3" → 3 p. m., intensidad "molesto" = 5', () => {
    const r = x(sample('hora-explicita'));
    const s = r.events.find((e) => e.type === 'symptom');
    if (s?.type !== 'symptom') throw new Error();
    expect(parseISO(s.occurred_at!).getHours()).toBe(15);
    expect(s.data.intensity_0_10).toBe(5);
    expect(r.events.some((e) => e.type === 'food' && e.data.categories.includes('frito'))).toBe(true);
  });

  it('salud mental → bandera roja de tipo mental', () => {
    expect(detectRedFlags(sample('bandera-mental')).kind).toBe('mental');
  });
});

describe('banderas rojas: variantes coloquiales', () => {
  it.each([
    ['tengo una presión en el pecho', 'chest_pain'],
    ['me falta el aire', 'breathing'],
    ['es el peor dolor de cabeza de mi vida', 'thunderclap_headache'],
    ['tengo fiebre y el cuello rígido', 'meningitis_signs'],
    ['se me durmió medio cuerpo', 'stroke_signs'],
    ['tengo la boca torcida', 'stroke_signs'],
    ['me desmayé en el baño', 'fainting'],
    ['vomité con sangre', 'gi_bleeding'],
    ['la popó me salió negra', 'gi_bleeding'],
    ['se me hincharon los labios', 'anaphylaxis'],
    ['estoy embarazada y estoy sangrando', 'pregnancy_bleeding'],
    ['ya no quiero vivir', 'self_harm'],
  ])('"%s" → %s', (text, cat) => {
    expect(detectRedFlags(text).categories).toContain(cat);
  });

  it.each(['me duele la cabeza', 'comí pechuga de pollo', 'me dolió la espalda', 'tengo sueño', 'respiré profundo y me relajé'])(
    'no alarma de más: "%s"',
    (text) => expect(detectRedFlags(text).detected).toBe(false),
  );
});
