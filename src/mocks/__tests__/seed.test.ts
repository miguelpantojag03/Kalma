import { addHours, parseISO } from 'date-fns';
import { dayKey } from '@/lib/dates';
import { EntrySchema, ExperimentSchema, ProfileSchema, type StoredEvent } from '@/lib/schema';
import { allEvents, analysisProgress, dayStatus, eventsByDay, recordedDays } from '@/lib/selectors';
import { generateSeed, SKIPPED_DAYS_AGO } from '../seed';

// "Hoy" fijo a las 23:00 para que el último día esté completo y la prueba sea estable.
const NOW = new Date('2026-10-17T23:00:00');
const seed = generateSeed({ now: NOW });
const events = allEvents(seed.entries);
const byDay = eventsByDay(seed.entries);

const symptoms = (name: string) => events.filter((e): e is Extract<StoredEvent, { type: 'symptom' }> => e.type === 'symptom' && e.data.name === name);

describe('semilla de Laura — estructura', () => {
  it('es determinística (misma semilla → mismos datos)', () => {
    expect(generateSeed({ now: NOW }).entries).toEqual(seed.entries);
  });

  it('cubre 45 días con exactamente 3 sin registro', () => {
    expect(recordedDays(seed.entries).size).toBe(45 - SKIPPED_DAYS_AGO.length);
    expect(seed.truth.skippedDays).toHaveLength(3);
    for (const k of seed.truth.skippedDays) expect(dayStatus(byDay, k)).toBeNull();
  });

  it('todas las entradas, el perfil y el experimento validan contra los esquemas', () => {
    for (const e of seed.entries) expect(() => EntrySchema.parse(e)).not.toThrow();
    expect(() => ProfileSchema.parse(seed.profile)).not.toThrow();
    for (const x of seed.experiments) expect(() => ExperimentSchema.parse(x)).not.toThrow();
  });

  it('nada ocurre en el futuro', () => {
    for (const e of seed.entries) expect(parseISO(e.recordedAt).getTime()).toBeLessThanOrEqual(NOW.getTime());
  });

  it('tiene un experimento terminado de 14 días', () => {
    expect(seed.experiments).toHaveLength(1);
    expect(seed.experiments[0]).toMatchObject({ status: 'finished', durationDays: 14 });
    expect(Object.keys(seed.experiments[0]!.adherence)).toHaveLength(14);
  });

  it('ya alcanza para el primer análisis (≥ 14 días)', () => {
    expect(analysisProgress(seed.entries).ready).toBe(true);
  });

  it('incluye al menos un evento editado por la persona', () => {
    expect(events.some((e) => e.edited)).toBe(true);
  });
});

describe('semilla de Laura — robusta a la fecha de la demo', () => {
  // La demo se genera relativa a "hoy": debe funcionar igual el día de la sustentación.
  it.each(['2026-01-05', '2026-03-31', '2026-06-15', '2026-09-01', '2026-11-27', '2027-02-14'])('con hoy = %s', (d) => {
    const s = generateSeed({ now: new Date(`${d}T23:00:00`) });
    const short = s.truth.shortSleepDays.filter((k) => k !== d);
    const head = new Set(s.truth.headacheDays);
    const normal = [...recordedDays(s.entries)].filter((k) => k !== d && !short.includes(k));
    expect(short.length).toBeGreaterThanOrEqual(8);
    expect(short.filter((k) => head.has(k)).length / short.length).toBeGreaterThan(0.65);
    expect(normal.filter((k) => head.has(k)).length / normal.length).toBeLessThan(0.15);
    expect(s.truth.digestiveDays.filter((k) => s.truth.dairyDays.includes(k)).length).toBeGreaterThanOrEqual(8);
  });
});

describe('semilla de Laura — patrones plantados', () => {
  const sleepByDay = new Map(events.filter((e) => e.type === 'sleep').map((e) => [dayKey(e.occurred_at!), e]));

  it('patrón 1: dolor de cabeza mucho más frecuente tras dormir < 6 h (y llega 6–24 h después)', () => {
    const headaches = symptoms('dolor de cabeza');
    const headacheDays = new Set(headaches.map((h) => dayKey(h.occurred_at!)));
    const shortDays = [...sleepByDay].filter(([, s]) => s.type === 'sleep' && s.data.hours < 6).map(([k]) => k);
    const normalDays = [...sleepByDay].filter(([, s]) => s.type === 'sleep' && s.data.hours >= 6).map(([k]) => k);

    const rateShort = shortDays.filter((k) => headacheDays.has(k)).length / shortDays.length;
    const rateNormal = normalDays.filter((k) => headacheDays.has(k)).length / normalDays.length;

    expect(shortDays.length).toBeGreaterThanOrEqual(6); // suficientes episodios para "Probable/Fuerte"
    expect(rateShort).toBeGreaterThan(0.5);
    expect(rateNormal).toBeLessThan(0.25);
    expect(rateShort / Math.max(rateNormal, 0.01)).toBeGreaterThan(3); // riesgo relativo alto

    for (const h of headaches) {
      const s = sleepByDay.get(dayKey(h.occurred_at!))!;
      const hoursAfter = (parseISO(h.occurred_at!).getTime() - parseISO(s.occurred_at!).getTime()) / 36e5;
      expect(hoursAfter).toBeGreaterThanOrEqual(6);
      expect(hoursAfter).toBeLessThanOrEqual(24);
    }
  });

  it('patrón 2: la molestia digestiva aparece 0–6 h después de un lácteo en la mayoría de los casos', () => {
    const dairy = events.filter((e) => (e.type === 'food' || e.type === 'drink') && e.data.categories.includes('lácteo'));
    const digestive = symptoms('molestia digestiva');
    const afterDairy = digestive.filter((d) =>
      dairy.some((f) => {
        const t = parseISO(f.occurred_at!);
        const dt = parseISO(d.occurred_at!);
        return dt >= t && dt <= addHours(t, 6);
      }),
    );
    expect(digestive.length).toBeGreaterThanOrEqual(6);
    expect(afterDairy.length / digestive.length).toBeGreaterThan(0.7);
  });

  it('el ruido (tinto, estrés) no está ligado al dolor de cabeza', () => {
    const headacheDays = new Set(symptoms('dolor de cabeza').map((h) => dayKey(h.occurred_at!)));
    const stressByDay = events.filter((e) => e.type === 'stress').map((e) => ({ k: dayKey(e.occurred_at!), v: e.type === 'stress' ? e.data.level_0_10 : 0 }));
    const high = stressByDay.filter((s) => s.v >= 6);
    const low = stressByDay.filter((s) => s.v < 6);
    const rHigh = high.filter((s) => headacheDays.has(s.k)).length / high.length;
    const rLow = low.filter((s) => headacheDays.has(s.k)).length / low.length;
    // Sin efecto plantado: la diferencia debe ser pequeña comparada con el patrón de sueño.
    expect(Math.abs(rHigh - rLow)).toBeLessThan(0.25);
    // El tinto aparece casi todos los días: sin contraste presente/ausente no puede ser "patrón".
    const tintoDays = new Set(events.filter((e) => e.type === 'drink' && e.data.canonical_name === 'café').map((e) => dayKey(e.occurred_at!)));
    expect(tintoDays.size).toBe(recordedDays(seed.entries).size);
  });
});
