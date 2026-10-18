import { EARLY_DAYS, earlyHints } from '@/lib/patterns';
import type { Entry, StoredEvent } from '@/lib/schema';
import { generateSeed } from '@/mocks/seed';

const NOW = new Date('2026-10-18T15:00:00');
const day = (ago: number) => { const d = new Date(NOW); d.setDate(d.getDate() - ago); return d.toISOString().slice(0, 10); };
let n = 0;
function entry(at: string, event: Omit<StoredEvent, 'id' | 'entryId' | 'edited' | 'occurred_at' | 'occurred_at_precision' | 'confidence' | 'source_text'>): Entry {
  const id = `h-${++n}`;
  const iso = new Date(at).toISOString();
  return { id, recordedAt: iso, source: 'text', transcript: '', summary: '', events: [{ ...event, id: `${id}-0`, entryId: id, edited: false, occurred_at: iso, occurred_at_precision: 'exact', confidence: 1, source_text: '' } as StoredEvent] };
}
const tinto = (ago: number) => entry(`${day(ago)}T07:00:00`, { type: 'drink', data: { name: 'Tinto', canonical_name: 'café', categories: ['cafeína'] } });
const headache = (ago: number) => entry(`${day(ago)}T11:00:00`, { type: 'symptom', data: { name: 'dolor de cabeza', intensity_0_10: 6, intensity_inferred: false } });

describe('pistas tempranas (5 a 13 días)', () => {
  it(`no hay pistas antes de ${EARLY_DAYS} días`, () => {
    expect(earlyHints(generateSeed({ now: NOW, days: EARLY_DAYS, seed: 20261017 }).entries, NOW)).toEqual([]);
  });

  it('a la semana encuentra la coincidencia plantada (lácteos → molestia digestiva) con distintas semillas', () => {
    for (const seed of [1, 2, 3, 20261017]) {
      const hints = earlyHints(generateSeed({ now: NOW, days: 8, seed }).entries, NOW);
      expect(hints.some((h) => h.outcome === 'molestia digestiva' && h.factorId === 'cat-lácteo')).toBe(true);
      expect(hints.length).toBeLessThanOrEqual(3);
    }
  });

  it('no repite la misma historia (almojábana = lácteo + harina cuenta una sola vez)', () => {
    const hints = earlyHints(generateSeed({ now: NOW, days: 6, seed: 20261017 }).entries, NOW);
    expect(hints.map((h) => h.factorId)).toEqual(['cat-lácteo']);
  });

  it('si el factor está TODOS los días (tinto diario), no es una pista', () => {
    const es = [0, 1, 2, 3, 4, 5, 6].flatMap((ago) => [tinto(ago), ...(ago % 2 === 0 ? [headache(ago)] : [])]);
    expect(earlyHints(es, NOW)).toEqual([]);
  });

  it('las frases dicen números, nunca causa, y traen la comparación sin el factor', () => {
    const [h] = earlyHints(generateSeed({ now: NOW, days: 8, seed: 1 }).entries, NOW);
    expect(h!.statement).toMatch(/^\d+ de tus \d+ .+ llegaron .+\.$/);
    expect(h!.contrast).toMatch(/^Los días sin eso, pasó en \d+ de \d+\.$/);
    expect(`${h!.statement} ${h!.contrast}`).not.toMatch(/caus|provoc|culpa/i);
  });

  it('con 14 días o más desaparecen: ahí ya hablan los patrones', () => {
    expect(earlyHints(generateSeed({ now: NOW }).entries, NOW)).toEqual([]);
  });
});
