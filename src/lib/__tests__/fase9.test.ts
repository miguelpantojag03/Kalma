import { adherenceDays, expiredIds, experimentDay, templateFor, touchesMedication } from '@/lib/experiments';
import type { Experiment } from '@/lib/schema';
import { organizeVisitSync, VISIT_EXAMPLES } from '@/mocks/organizeVisit';

const exp = (over: Partial<Experiment> = {}): Experiment => ({
  id: 'e', title: 'Dormir al menos 7 horas', factor: 'sleep-short', durationDays: 14, startDate: '2026-10-10',
  adherence: { '2026-10-10': true, '2026-10-11': false }, status: 'active', outcome: 'dolor de cabeza', ...over,
});

describe('experimentos', () => {
  it('nunca hay plantillas sobre medicamentos', () => {
    expect(templateFor('sleep-short')?.title).toBe('Dormir al menos 7 horas');
    expect(templateFor('cat-lácteo')?.title).toBe('Evitar los lácteos');
    expect(templateFor('medicamento')).toBeUndefined();
  });

  it.each([
    'Dejar el dolex por dos semanas',
    'suspender el acetaminofén',
    'No tomar las pastillas de la migraña',
    'bajar la dosis del topiramato',
    'Quitar el tratamiento',
  ])('bloquea experimentos que tocan el tratamiento: "%s"', (t) => expect(touchesMedication(t)).toBe(true));

  it.each(['Dormir al menos 7 horas', 'Evitar los lácteos', 'Tomar 6 vasos de agua', 'Dejar el celular antes de dormir'])(
    'permite hábitos: "%s"',
    (t) => expect(touchesMedication(t)).toBe(false),
  );

  it('calcula el día del experimento y lo cierra cuando termina', () => {
    expect(experimentDay(exp(), new Date('2026-10-10T12:00:00'))).toBe(1);
    expect(experimentDay(exp(), new Date('2026-10-23T12:00:00'))).toBe(14);
    expect(expiredIds([exp()], new Date('2026-10-23T12:00:00'))).toEqual([]);
    expect(expiredIds([exp()], new Date('2026-10-24T12:00:00'))).toEqual(['e']);
    expect(expiredIds([exp({ status: 'finished' })], new Date('2026-12-01T12:00:00'))).toEqual([]);
  });

  it('lista los días con su adherencia', () => {
    const days = adherenceDays(exp(), new Date('2026-10-12T12:00:00'));
    expect(days).toHaveLength(14);
    expect(days[0]).toMatchObject({ index: 1, done: true, future: false });
    expect(days[1]).toMatchObject({ done: false });
    expect(days[5]!.future).toBe(true);
  });
});

describe('volví del médico', () => {
  const base = new Date('2026-10-18T10:00:00');

  it('organiza la visita de la neuróloga', () => {
    const v = organizeVisitSync(VISIT_EXAMPLES[0]!, base);
    expect(v.diagnoses).toEqual(['migraña sin aura']);
    expect(v.medications).toEqual([expect.objectContaining({ name: 'Sumatriptán', dose: '50 mg' })]);
    expect(v.medications[0]!.frequency).toMatch(/duele/);
    expect(v.instructions.join(' ')).toMatch(/7 horas/);
    expect(v.followUps).toEqual([expect.objectContaining({ date: '2026-11-18' })]);
  });

  it('organiza la visita del gastroenterólogo', () => {
    const v = organizeVisitSync(VISIT_EXAMPLES[1]!, base);
    expect(v.diagnoses).toContain('síndrome de intestino irritable');
    expect(v.medications.map((m) => m.name)).toContain('Trimebutina');
    expect(v.medications[0]!.frequency).toBe('tres veces al día');
    expect(v.instructions.join(' ')).toMatch(/lácteos/);
    expect(v.followUps.some((f) => f.date === '2026-11-02')).toBe(true);
  });

  it('no inventa nada si no se mencionó', () => {
    const v = organizeVisitSync('Fui a la cita y todo bien', base);
    expect(v.diagnoses).toEqual([]);
    expect(v.medications).toEqual([]);
  });
});
