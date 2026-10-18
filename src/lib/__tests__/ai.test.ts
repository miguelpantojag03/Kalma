import { localIso, organizeVisitAI, understandEntry, validEvents } from '@/lib/ai';

const mockInvoke = jest.fn();
jest.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));

const NOW = new Date('2026-10-18T14:00:00');
const offset = localIso(NOW).slice(-6);
const ok = (result: unknown) => mockInvoke.mockResolvedValueOnce({ data: { result, model: 'gemini-2.5-flash' }, error: null });

const headache = {
  type: 'symptom', occurred_at: `2026-10-18T13:00:00${offset}`, occurred_at_precision: 'approximate', confidence: 0.9, source_text: 'me dolió la cabeza',
  data: { name: 'Dolor de cabeza', body_location: 'cabeza', side: null, intensity_0_10: null, intensity_inferred: false, character: null, duration_minutes: null },
};

beforeEach(() => mockInvoke.mockReset());

describe('IA real con salvaguardas (Gemini vía Edge Function)', () => {
  it('envía solo la tarea, el texto y la hora local con desfase', async () => {
    ok({ summary: 'x', events: [headache], unparsed: null });
    await understandEntry('me dolió la cabeza', NOW);
    expect(mockInvoke).toHaveBeenCalledWith('ai', { body: { task: 'entry', text: 'me dolió la cabeza', now: localIso(NOW) } });
    expect(localIso(NOW)).toMatch(/^2026-10-18T14:00:00[+-]\d{2}:\d{2}$/);
  });

  it('usa los eventos de la IA, pero la pregunta de seguimiento y el resumen salen de las reglas locales', async () => {
    ok({ summary: 'lo que diga el modelo', events: [headache], unparsed: null });
    const { extraction, engine } = await understandEntry('me dolió la cabeza', NOW);
    expect(engine).toBe('gemini');
    expect(extraction.events[0]!.type === 'symptom' && extraction.events[0]!.data.name).toBe('dolor de cabeza');
    expect(extraction.follow_up.question).toBe('¿Qué tan fuerte es el dolor de cabeza?');
    expect(extraction.summary).not.toBe('lo que diga el modelo');
    expect(extraction.summary).toContain('dolor de cabeza');
  });

  it('las banderas rojas son SIEMPRE locales, aunque la IA no las marque', async () => {
    ok({ summary: 'x', events: [{ ...headache, source_text: 'el peor dolor de cabeza de mi vida' }], unparsed: null });
    const { extraction } = await understandEntry('tengo el peor dolor de cabeza de mi vida, de repente', NOW);
    expect(extraction.red_flag.detected).toBe(true);
    expect(extraction.follow_up.question).toBeNull(); // con bandera roja no se pregunta nada
  });

  it('descarta eventos inválidos y arregla horas sin desfase', () => {
    const events = validEvents({
      events: [
        { ...headache, occurred_at: '2026-10-18T13:00' },              // sin desfase → se completa
        { type: 'food', occurred_at: null, occurred_at_precision: 'unknown', confidence: 2, source_text: 'arepa', data: { name: 'Arepa' } }, // sin canonical ni categorías → se completan
        { type: 'symptom', data: { intensity_0_10: 40 } },             // inválido → se descarta
        { type: 'inventado', data: {} },                               // tipo desconocido → se descarta
      ],
    }, NOW);
    expect(events).toHaveLength(2);
    expect(events[0]!.occurred_at).toBe(`2026-10-18T13:00:00${offset}`);
    expect(events[1]!.confidence).toBe(1);
    expect(events[1]!.type === 'food' && events[1]!.data).toMatchObject({ canonical_name: 'arepa', categories: [] });
  });

  it('si la IA falla, no responde o no entiende nada, usa el analizador local', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new Error('quota') });
    expect((await understandEntry('desayuné arepa con huevo', NOW)).engine).toBe('local');

    mockInvoke.mockRejectedValueOnce(new Error('sin red'));
    expect((await understandEntry('desayuné arepa con huevo', NOW)).engine).toBe('local');

    ok({ summary: 'x', events: [], unparsed: 'desayuné arepa con huevo' });
    const r = await understandEntry('desayuné arepa con huevo', NOW);
    expect(r.engine).toBe('local');
    expect(r.extraction.events.length).toBeGreaterThan(0);
  });

  it('no envía textos demasiado largos (límite de la función)', async () => {
    const r = await understandEntry('a'.repeat(1600), NOW);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(r.engine).toBe('local');
  });

  it('«Volví del médico» usa la IA si responde bien y el organizador local si no', async () => {
    ok({ diagnoses: ['migraña sin aura'], medications: [{ name: 'Sumatriptán', dose: '50 mg' }], instructions: ['Dormir mínimo 7 horas'], followUps: [{ label: 'Control', date: '2026-11-02' }] });
    const a = await organizeVisitAI('la neuróloga dijo que es migraña sin aura', NOW);
    expect(a.engine).toBe('gemini');
    expect(a.visit.medications[0]).toEqual({ name: 'Sumatriptán', dose: '50 mg', frequency: null });

    ok({ diagnoses: 'no es una lista' });
    expect((await organizeVisitAI('me dijo que es migraña y que tome sumatriptán', NOW)).engine).toBe('local');
  });
});
