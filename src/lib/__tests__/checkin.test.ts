import { buildCheckin } from '@/lib/checkin';
import type { StoredEvent } from '@/lib/schema';

const base = { occurred_at: '2026-10-17T14:00:00.000Z', occurred_at_precision: 'exact' as const, confidence: 1, source_text: '', entryId: 'e', edited: false };
const sleep: StoredEvent = { ...base, id: 's', type: 'sleep', data: { hours: 5, quality_1_5: 2 } };
const headache: StoredEvent = { ...base, id: 'h', type: 'symptom', data: { name: 'dolor de cabeza', intensity_0_10: 6, intensity_inferred: false } };

describe('check-in nocturno adaptativo', () => {
  it('día vacío: pregunta sueño, síntomas olvidados, estrés, ánimo y agua (máx. 5)', () => {
    const qs = buildCheckin([]);
    expect(qs.map((q) => q.id)).toEqual(['sleep', 'missed-symptom', 'stress', 'mood', 'water']);
  });

  it('no pregunta por el sueño si ya se registró', () => {
    expect(buildCheckin([sleep]).map((q) => q.id)).not.toContain('sleep');
  });

  it('si hubo un síntoma, pregunta cómo sigue (en vez de síntomas olvidados)', () => {
    const qs = buildCheckin([headache]);
    expect(qs.map((q) => q.id)).toContain('symptom-followup');
    expect(qs.find((q) => q.id === 'symptom-followup')!.question).toBe('¿Cómo sigue el dolor de cabeza?');
    expect(qs.map((q) => q.id)).not.toContain('missed-symptom');
  });

  it('siempre entre 3 y 5 preguntas, cada una con ≤ 5 opciones (ley de Hick)', () => {
    for (const day of [[], [sleep], [headache], [sleep, headache]]) {
      const qs = buildCheckin(day);
      expect(qs.length).toBeGreaterThanOrEqual(3);
      expect(qs.length).toBeLessThanOrEqual(5);
      for (const q of qs) expect(q.options.length).toBeLessThanOrEqual(5);
    }
  });

  it('las respuestas generan eventos válidos (sueño de anoche ubicado en la mañana)', () => {
    const q = buildCheckin([]).find((x) => x.id === 'sleep')!;
    const [e] = q.options.find((o) => o.label === '5 a 6')!.build('2026-10-17T21:30:00');
    expect(e?.type).toBe('sleep');
    expect(e?.type === 'sleep' && e.data.hours).toBe(5.5);
    expect(new Date(e!.occurred_at!).getHours()).toBe(6);
  });
});
