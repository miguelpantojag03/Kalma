import { analyzePatterns, benjaminiHochberg, experimentResult, fisherGreater } from '@/lib/patterns';
import { generateSeed } from '@/mocks/seed';

describe('estadística', () => {
  it('Fisher exacta unilateral coincide con valores de referencia', () => {
    // Tabla clásica "lady tasting tea" [[3,1],[1,3]]: p unilateral = 0.2429
    expect(fisherGreater(3, 1, 1, 3)).toBeCloseTo(0.2429, 3);
    // Sin asociación: p alto
    expect(fisherGreater(2, 8, 2, 8)).toBeGreaterThan(0.5);
    // Asociación fuerte: p muy bajo
    expect(fisherGreater(9, 1, 1, 19)).toBeLessThan(0.001);
  });

  it('Benjamini–Hochberg es monótono y nunca menor que p', () => {
    const ps = [0.001, 0.008, 0.039, 0.041, 0.042, 0.06, 0.074, 0.205, 0.212, 0.216];
    const q = benjaminiHochberg(ps);
    q.forEach((qi, i) => expect(qi).toBeGreaterThanOrEqual(ps[i]!));
    expect(q[0]).toBeCloseTo(0.01, 3);
  });
});

describe('motor de patrones sobre la demo de Laura', () => {
  // Criterio de aceptación: con la demo, Patrones muestra los dos patrones plantados y ningún factor aleatorio como "fuerte".
  it.each(['2026-10-17', '2026-01-05', '2026-03-31', '2026-06-15', '2026-09-01', '2026-11-27', '2027-02-14'])('con hoy = %s', (d) => {
    const now = new Date(`${d}T23:00:00`);
    const { entries } = generateSeed({ now });
    const a = analyzePatterns(entries, now);

    expect(a.ready).toBe(true);
    const sleep = a.patterns.find((p) => p.outcome === 'dolor de cabeza' && p.factorId === 'sleep-short');
    const dairy = a.patterns.find((p) => p.outcome === 'molestia digestiva' && p.factorId === 'cat-lácteo');

    // Los dos plantados aparecen con nivel alto
    expect(sleep).toBeDefined();
    expect(sleep!.level).toBe('strong');
    expect(['6-24h', '24-48h', 'prev-day', '0-6h']).toContain(sleep!.window);
    expect(dairy).toBeDefined();
    expect(['strong', 'probable']).toContain(dairy!.level);
    expect(dairy!.window).toBe('0-6h');

    // Ningún otro factor sale como "fuerte"
    const otherStrong = a.patterns.filter((p) => p.level === 'strong' && p !== sleep && p !== dairy);
    expect(otherStrong).toEqual([]);
  });

  it('descarta "harinas" por ir junto con los lácteos (control de confusión)', () => {
    const now = new Date('2026-10-17T23:00:00');
    const a = analyzePatterns(generateSeed({ now }).entries, now);
    expect(a.patterns.find((p) => p.outcome === 'molestia digestiva' && p.factorId === 'cat-harina')).toBeUndefined();
  });

  it('las frases tienen números y no usan lenguaje causal', () => {
    const now = new Date('2026-10-17T23:00:00');
    const a = analyzePatterns(generateSeed({ now }).entries, now);
    for (const p of a.patterns) {
      expect(p.statement).toMatch(/\d+ %/);
      expect(`${p.statement} ${p.comparison}`).not.toMatch(/caus|provoc|produce|te da |culpa/i);
    }
    const sleep = a.patterns.find((p) => p.factorId === 'sleep-short')!;
    expect(sleep.statement).toMatch(/^El \d+ % de tus dolores de cabeza llegaron después de noches de menos de 6 horas\.$/);
  });

  it('no muestra patrones con menos de 14 días', () => {
    const now = new Date('2026-10-17T23:00:00');
    const { entries } = generateSeed({ now, days: 10 });
    const a = analyzePatterns(entries, now);
    expect(a.ready).toBe(false);
    expect(a.patterns).toEqual([]);
  });

  it('es determinístico', () => {
    const now = new Date('2026-10-17T23:00:00');
    const { entries } = generateSeed({ now });
    expect(analyzePatterns(entries, now)).toEqual(analyzePatterns(entries, now));
  });
});

describe('resultado de experimentos', () => {
  it('el experimento de dormir antes muestra menos dolores de cabeza durante que antes', () => {
    const now = new Date('2026-10-17T23:00:00');
    const s = generateSeed({ now });
    const exp = s.experiments[0]!;
    const r = experimentResult(s.entries, exp.startDate, exp.durationDays, exp.adherence, 'dolor de cabeza');
    expect(r.enoughData).toBe(true);
    expect(r.during.rate).toBeLessThan(r.before.rate);
  });
});
