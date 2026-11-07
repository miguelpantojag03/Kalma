import { buildReport, reportHtml } from '@/lib/report';
import {
  ideasForKind, localReliefIdeas, pickValidIdeas, recentSymptom, reliefContext, RELIEF_IDEAS, SEEK_CARE, symptomKind,
  type SymptomKind,
} from '@/lib/relief';
import type { Entry } from '@/lib/schema';
import { generateSeed } from '@/mocks/seed';

const KINDS: SymptomKind[] = ['headache', 'digestive', 'acidity', 'nausea', 'dizziness', 'cramps', 'general'];
const now = new Date('2026-11-07T15:00:00');

const entry = (id: string, at: string, events: Entry['events']): Entry => ({
  id, recordedAt: at, source: 'text', transcript: 'amanecí con jaqueca', summary: '', events,
});
const base = { occurred_at_precision: 'exact' as const, confidence: 1, source_text: '' };
const headache = (id: string, at: string, intensity: number | null, relief?: unknown) =>
  ({ ...base, id, type: 'symptom', occurred_at: at, data: { name: 'dolor de cabeza', body_location: 'cabeza', intensity_0_10: intensity, intensity_inferred: false, ...(relief ? { relief } : {}) } }) as unknown as Entry['events'][number];
const food = (id: string, at: string) =>
  ({ ...base, id, type: 'food', occurred_at: at, data: { name: 'arepa', canonical_name: 'arepa', categories: [] } }) as unknown as Entry['events'][number];

describe('ideas de alivio (D90)', () => {
  it('clasifica los síntomas como los dice la gente', () => {
    expect(symptomKind('dolor de cabeza', 'cabeza')).toBe('headache');
    expect(symptomKind('jaqueca')).toBe('headache');
    expect(symptomKind('molestia digestiva', 'abdomen')).toBe('digestive');
    expect(symptomKind('agrieras')).toBe('acidity');
    expect(symptomKind('náuseas')).toBe('nausea');
    expect(symptomKind('mareo')).toBe('dizziness');
    expect(symptomKind('cólico menstrual')).toBe('cramps');
    expect(symptomKind('cólico', 'abdomen')).toBe('digestive');
    expect(symptomKind('cansancio')).toBe('general');
  });

  it('el catálogo NUNCA menciona medicamentos, dosis, suplementos ni causas', () => {
    const forbidden = /acetaminof|ibuprof|naprox|aspirin|dolex|advil|omepraz|pastilla|tableta|c[aá]psula|\bmg\b|dosis|medicamento|suplement|(^|\s)t[eé] de\s|jengibre|remedio|\bcura\b|te causa|por culpa/i;
    for (const i of RELIEF_IDEAS) expect(`${i.title} ${i.text}`).not.toMatch(forbidden);
  });

  it('cada tipo de síntoma tiene al menos 3 ideas y sus señales para buscar atención', () => {
    for (const k of KINDS) {
      expect(ideasForKind(k).length).toBeGreaterThanOrEqual(3);
      expect(SEEK_CARE[k].urgent.length).toBeGreaterThan(20);
      expect(SEEK_CARE[k].soon.length).toBeGreaterThan(10);
    }
  });

  it('lo que elige la IA se valida: solo ids del catálogo y del tipo, sin repetir, máximo 3', () => {
    expect(pickValidIdeas(['oscuro', 'inventado', 'oscuro', 'no-acostarse', 'frio-frente', 'agua', 'pantallas'], 'headache').map((i) => i.id))
      .toEqual(['oscuro', 'frio-frente', 'agua']);
    expect(pickValidIdeas('oscuro', 'headache')).toEqual([]);
    expect(pickValidIdeas([{ id: 'oscuro' }], 'headache')).toEqual([]);
  });

  it('sin IA: propone comer algo solo si lleva horas sin comer, y con dolor fuerte no pide moverse', () => {
    const hungry = localReliefIdeas('headache', { intensity: 5, hoursSinceFood: 6, tookMedication: false }).map((i) => i.id);
    const fed = localReliefIdeas('headache', { intensity: 5, hoursSinceFood: 1, tookMedication: false }).map((i) => i.id);
    expect(hungry).toContain('comer-algo');
    expect(fed).not.toContain('comer-algo');
    expect(localReliefIdeas('cramps', { intensity: 9, hoursSinceFood: 1, tookMedication: false }).map((i) => i.id)).not.toContain('caminar');
    expect(hungry).toHaveLength(3);
  });

  it('Hoy muestra el síntoma de las últimas 6 horas y el contexto sale de los registros', () => {
    const entries = [
      entry('a', '2026-11-07T07:00:00', [food('f1', '2026-11-07T07:00:00')]),
      entry('b', '2026-11-07T13:00:00', [headache('s1', '2026-11-07T13:00:00', 7)]),
      entry('c', '2026-11-07T05:00:00', [headache('s0', '2026-11-07T05:00:00', 3)]),
    ];
    const ref = recentSymptom(entries, now)!;
    expect(ref.event.id).toBe('s1');
    expect(ref.kind).toBe('headache');
    const ctx = reliefContext(entries, ref, now);
    expect(ctx.intensity).toBe(7);
    expect(Math.round(ctx.hoursSinceFood!)).toBe(8);
    expect(recentSymptom(entries, new Date('2026-11-07T23:00:00'))).toBeNull();
  });

  it('lo que probó va al reporte para el médico, con si le ayudó', () => {
    const seed = generateSeed({ now });
    const tries = [{ id: 'oscuro', helped: 'yes', at: '2026-11-07T13:30:00' }, { id: 'frio-frente', helped: null, at: '2026-11-07T13:31:00' }];
    const entries = [...seed.entries, entry('r', '2026-11-07T13:00:00', [headache('s9', '2026-11-07T13:00:00', 6, tries)])];
    const d = buildReport({ entries, profile: seed.profile, experiments: [], patterns: [], selectedPatternIds: [], rangeDays: 30, questions: [], now });
    expect(d.selfCare.map((m) => m.title)).toEqual(expect.arrayContaining(['Descansar a oscuras y en silencio', 'Algo frío en la frente o la nuca']));
    const html = reportHtml(d, ['medications']);
    expect(html).toContain('Medidas sin medicamento que probó');
    expect(html).toContain('1 le ayudó');
  });
});
