import { buildCheckin } from '@/lib/checkin';
import { cycleSummary, periods, symptomsAroundPeriod } from '@/lib/cycle';
import { weekFood } from '@/lib/food';
import { medicationUse, weekComparison, weekSummary } from '@/lib/insights';
import { dailyMessage, MESSAGE_COUNT } from '@/lib/motivation';
import type { Pattern } from '@/lib/patterns';
import type { Entry, StoredEvent } from '@/lib/schema';
import { GENERAL_TIPS, personalTips, TIPS_NOTE } from '@/lib/tips';
import { generateSeed } from '@/mocks/seed';

const NOW = new Date('2026-10-18T15:00:00');
let n = 0;
/** Un registro con un evento, en la fecha y hora dadas (hora local). */
function entry(date: string, event: Omit<StoredEvent, 'id' | 'entryId' | 'edited' | 'occurred_at' | 'occurred_at_precision' | 'confidence' | 'source_text'>): Entry {
  const id = `t-${++n}`;
  const at = new Date(date).toISOString();
  return {
    id, recordedAt: at, source: 'text', transcript: '', summary: '',
    events: [{ ...event, id: `${id}-0`, entryId: id, edited: false, occurred_at: at, occurred_at_precision: 'exact', confidence: 1, source_text: '' } as StoredEvent],
  };
}
const period = (d: string) => entry(`${d}T08:00:00`, { type: 'menstrual', data: { flow: 'medium' } });
const headache = (d: string, intensity = 6) => entry(`${d}T14:00:00`, { type: 'symptom', data: { name: 'dolor de cabeza', intensity_0_10: intensity, intensity_inferred: false } });
const food = (d: string, h: number, categories: string[], meal?: 'breakfast' | 'lunch' | 'snack' | 'dinner') =>
  entry(`${d}T${String(h).padStart(2, '0')}:00:00`, { type: 'food', data: { name: 'algo', categories, meal: meal ?? null } });
const med = (d: string, name = 'Acetaminofén (Dolex)') => entry(`${d}T15:00:00`, { type: 'medication', data: { name, generic_name: null } });
const day = (ago: number) => { const x = new Date(NOW); x.setDate(x.getDate() - ago); return x.toISOString().slice(0, 10); };

describe('mensaje del día', () => {
  it('es el mismo durante todo el día', () => {
    const ctx = { yesterdayMaxIntensity: null, recordedDays: 3 };
    expect(dailyMessage(ctx, new Date('2026-10-18T07:00:00')).text).toBe(dailyMessage(ctx, new Date('2026-10-18T22:00:00')).text);
  });

  it('después de un síntoma fuerte ayer, el mensaje es de cuidado', () => {
    expect(dailyMessage({ yesterdayMaxIntensity: 8, recordedDays: 20 }, NOW).mood).toBe('care');
    expect(dailyMessage({ yesterdayMaxIntensity: 4, recordedDays: 3 }, NOW).mood).not.toBe('care');
  });

  it('ningún mensaje culpa, habla de rachas ni promete salud', () => {
    const texts = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const d = new Date(2026, 0, 1 + i);
      for (const ctx of [{ yesterdayMaxIntensity: null, recordedDays: 30 }, { yesterdayMaxIntensity: 9, recordedDays: 30 }]) texts.add(dailyMessage(ctx, d).text);
    }
    expect(texts.size).toBe(MESSAGE_COUNT.general + MESSAGE_COUNT.care + MESSAGE_COUNT.progress);
    for (const t of texts) expect(t).not.toMatch(/racha|perdiste|deberías|fallaste|cura|sanar|garantiza/i);
  });
});

describe('ciclo menstrual', () => {
  it('agrupa días seguidos en un periodo y tolera un día sin anotar', () => {
    const ps = periods([period('2026-09-01'), period('2026-09-02'), period('2026-09-04'), period('2026-09-29')]);
    expect(ps).toEqual([{ start: '2026-09-01', end: '2026-09-04', days: 4 }, { start: '2026-09-29', end: '2026-09-29', days: 1 }]);
  });

  it('calcula la duración del ciclo, el día de hoy y el próximo periodo', () => {
    const es = ['2026-08-24', '2026-08-25', '2026-09-21', '2026-09-22', '2026-10-19'].slice(0, 4).map(period);
    const s = cycleSummary(es, new Date('2026-10-01T12:00:00'));
    expect(s.cycleLength).toBe(28);
    expect(s.estimatedLength).toBe(false);
    expect(s.cycleDay).toBe(11);
    expect(s.nextStart).toBe('2026-10-19');
    expect(s.daysUntilNext).toBe(18);
    expect(s.inPeriod).toBe(false);
  });

  it('con un solo periodo usa 28 días y lo marca como estimado; hoy con periodo = en curso', () => {
    const s = cycleSummary([period('2026-10-17'), period('2026-10-18')], NOW);
    expect(s.estimatedLength).toBe(true);
    expect(s.cycleLength).toBe(28);
    expect(s.inPeriod).toBe(true);
    expect(s.cycleDay).toBe(2);
  });

  it('sin datos no inventa nada', () => {
    expect(cycleSummary([], NOW)).toMatchObject({ cycleDay: null, nextStart: null, inPeriod: false });
  });

  it('cuenta los síntomas en la ventana perimenstrual (2 días antes a 3 después)', () => {
    const es = [period('2026-09-10'), headache('2026-09-08'), headache('2026-09-13'), headache('2026-09-20')];
    expect(symptomsAroundPeriod(es, 'dolor de cabeza')).toEqual({ inWindow: 2, total: 3 });
  });

  it('el check-in pregunta por el periodo solo si la persona lo activó y no lo anotó hoy', () => {
    expect(buildCheckin([]).map((q) => q.id)).not.toContain('period');
    expect(buildCheckin([], { tracksCycle: true }).map((q) => q.id)).toContain('period');
    const today = period(day(0)).events;
    expect(buildCheckin(today, { tracksCycle: true }).map((q) => q.id)).not.toContain('period');
  });

  it('la demo de Laura tiene dos periodos y un ciclo de 28 días', () => {
    const s = cycleSummary(generateSeed({ now: NOW }).entries, NOW);
    expect(s.periods).toHaveLength(2);
    expect(s.cycleLength).toBe(28);
    expect(s.cycleDay).toBe(9);
  });
});

describe('diario de comidas y consejos', () => {
  it('resume la semana: categorías, días sin desayuno, cafeína tarde y agua', () => {
    const es = [
      food(day(0), 13, ['lácteo', 'harina'], 'lunch'),
      food(day(1), 8, ['lácteo'], 'breakfast'),
      food(day(1), 16, ['cafeína']),
      food(day(2), 19, ['frito'], 'dinner'),
      entry(`${day(1)}T21:00:00`, { type: 'water', data: { glasses: 3 } }),
      food(day(9), 8, ['alcohol']), // fuera de la semana
    ];
    const w = weekFood(es, NOW);
    expect(w.daysWithFood).toBe(3);
    expect(w.noBreakfastDays).toBe(2);
    expect(w.lateCaffeineDays).toBe(1);
    expect(w.waterAvg).toBe(3);
    expect(w.categoryDays[0]).toEqual({ category: 'lácteo', days: 2 });
    expect(w.categoryDays.map((c) => c.category)).not.toContain('alcohol');
  });

  it('los consejos personales nacen de patrones de comida y de los datos de la semana', () => {
    const pattern = { id: 'molestia digestiva|cat-lácteo|0-6h', outcome: 'molestia digestiva', factorId: 'cat-lácteo', factorShort: 'Lácteos', statement: 'El 95 % de tus molestias digestivas llegaron en las 6 horas después de comer lácteos.' } as Pattern;
    const tips = personalTips([pattern], { daysWithFood: 5, categoryDays: [], noBreakfastDays: 4, waterAvg: 3, lateCaffeineDays: 0 });
    expect(tips[0]!.title).toBe('Lácteos y tus molestias digestivas');
    expect(tips[0]!.patternId).toBe(pattern.id);
    expect(tips.map((t) => t.id)).toEqual(expect.arrayContaining(['p-horarios', 'p-agua']));
    expect(tips.length).toBeLessThanOrEqual(3);
  });

  it('ningún consejo habla de dietas, calorías, suplementos ni de dejar de comer algo', () => {
    for (const t of [...GENERAL_TIPS.map((x) => `${x.title} ${x.text}`), TIPS_NOTE]) {
      expect(t).not.toMatch(/calor[ií]a|suplement|ayuno|dieta (para|de)|deja de comer|prohib/i);
    }
  });
});

describe('resumen semanal y uso de medicamentos', () => {
  it('compara días con síntomas sin juzgar', () => {
    const s = weekSummary([headache(day(0)), headache(day(2)), headache(day(8))], NOW);
    expect(s).toMatchObject({ symptomDays: 2, prevSymptomDays: 1 });
    expect(weekComparison(s)).toBe('Esta semana: 2 días con síntomas (la anterior, 1 día).');
    expect(weekComparison(s)).not.toMatch(/mejor|peor|bien|mal/i);
  });

  it('avisa con 15 días de analgésicos o 10 de triptanes en 30 días (ICHD-3)', () => {
    const range = (k: number, name?: string) => Array.from({ length: k }, (_, i) => med(day(i), name));
    expect(medicationUse(range(14), NOW).frequent).toBe(false);
    expect(medicationUse(range(15), NOW).frequent).toBe(true);
    expect(medicationUse(range(9, 'Sumatriptán'), NOW).frequent).toBe(false);
    expect(medicationUse(range(10, 'Sumatriptán'), NOW)).toMatchObject({ frequent: true, triptanDays: 10 });
  });
});
