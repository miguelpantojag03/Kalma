import { useKalma } from '@/lib/store';
import type { ExtractedEvent } from '@/lib/schema';
import { analysisProgress } from '@/lib/selectors';

const headache: ExtractedEvent = {
  type: 'symptom',
  occurred_at: '2026-10-17T19:30:00.000Z',
  occurred_at_precision: 'part_of_day',
  confidence: 0.8,
  source_text: 'me dolió la cabeza fuerte después del almuerzo',
  data: { name: 'dolor de cabeza', intensity_0_10: 7, intensity_inferred: true },
};
const dolex: ExtractedEvent = {
  type: 'medication',
  occurred_at: '2026-10-17T19:45:00.000Z',
  occurred_at_precision: 'approximate',
  confidence: 0.95,
  source_text: 'me tomé un dolex',
  data: { name: 'Acetaminofén (Dolex)', generic_name: 'acetaminofén', relief: null },
};

const s = () => useKalma.getState();

beforeEach(() => s().startFresh());

describe('store', () => {
  it('"Reiniciar demo" carga a Laura y "Empezar desde cero" la vacía', () => {
    s().resetDemo();
    expect(s().profile.name).toBe('Laura');
    expect(s().entries.length).toBeGreaterThan(100);
    s().startFresh();
    expect(s().entries).toHaveLength(0);
    expect(s().profile.onboarded).toBe(false);
    expect(s().consent.health).toBe(false);
  });

  it('agrega una entrada con sus eventos', () => {
    const entry = s().addEntry({ transcript: 'Me dolió la cabeza…', summary: 'Dolor de cabeza y acetaminofén.', source: 'voice', events: [headache, dolex] });
    expect(s().entries).toHaveLength(1);
    expect(entry.events.map((e) => e.type)).toEqual(['symptom', 'medication']);
    expect(entry.events.every((e) => e.entryId === entry.id && !e.edited)).toBe(true);
    expect(analysisProgress(s().entries)).toEqual({ days: 1, needed: 14, ready: false });
  });

  it('editar marca el evento como "editado por ti" y mezcla los datos', () => {
    const entry = s().addEntry({ transcript: 't', summary: 's', source: 'voice', events: [headache] });
    s().updateEvent(entry.events[0]!.id, { data: { intensity_0_10: 5 } });
    const ev = s().entries[0]!.events[0]!;
    expect(ev.edited).toBe(true);
    expect(ev.type === 'symptom' && ev.data.intensity_0_10).toBe(5);
    expect(ev.type === 'symptom' && ev.data.name).toBe('dolor de cabeza');
  });

  it('quitar un evento se puede deshacer en su misma posición', () => {
    const entry = s().addEntry({ transcript: 't', summary: 's', source: 'voice', events: [headache, dolex] });
    s().removeEvent(entry.events[0]!.id);
    expect(s().entries[0]!.events.map((e) => e.type)).toEqual(['medication']);
    s().undoRemove();
    expect(s().entries[0]!.events.map((e) => e.type)).toEqual(['symptom', 'medication']);
    expect(s().lastRemoved).toBeNull();
  });

  it('quitar el último evento borra la entrada, y deshacer la restaura completa', () => {
    const entry = s().addEntry({ transcript: 't', summary: 's', source: 'voice', events: [headache] });
    s().removeEvent(entry.events[0]!.id);
    expect(s().entries).toHaveLength(0);
    s().undoRemove();
    expect(s().entries).toHaveLength(1);
    expect(s().entries[0]!.id).toBe(entry.id);
  });

  it('el consentimiento guarda cuándo se dio o revocó', () => {
    s().setConsent('health', true);
    expect(s().consent.health).toBe(true);
    expect(s().consent.updatedAt.health).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    s().setConsent('health', false);
    expect(s().consent.health).toBe(false);
  });

  it('experimentos: crear, registrar adherencia y terminar', () => {
    s().startExperiment({ title: 'Menos tinto después de las 2 p. m.', factor: 'cafeína', durationDays: 7, startDate: '2026-10-17' });
    const id = s().experiments[0]!.id;
    s().logAdherence(id, '2026-10-17', true);
    expect(s().experiments[0]!.adherence).toEqual({ '2026-10-17': true });
    s().endExperiment(id, 'finished');
    expect(s().experiments[0]!.status).toBe('finished');
  });

  it('patrones: descartar e incluir en reporte son alternables', () => {
    s().togglePatternDismissed('p1');
    s().togglePatternInReport('p2');
    expect(s().dismissedPatterns).toEqual(['p1']);
    expect(s().reportPatterns).toEqual(['p2']);
    s().togglePatternDismissed('p1');
    expect(s().dismissedPatterns).toEqual([]);
  });

  it('borrar todo deja la app como recién instalada', () => {
    s().resetDemo();
    s().wipeAll();
    expect(s().entries).toHaveLength(0);
    expect(s().experiments).toHaveLength(0);
    expect(s().profile.onboarded).toBe(false);
  });
});
