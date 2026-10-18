import { analyzePatterns } from '@/lib/patterns';
import { buildReport, MAX, reportHtml, suggestedQuestions, type ReportSection } from '@/lib/report';
import { generateSeed } from '@/mocks/seed';

const now = new Date('2026-10-17T23:00:00');
const seed = generateSeed({ now });
const patterns = analyzePatterns(seed.entries, now).patterns;
const ALL: ReportSection[] = ['summary', 'timeline', 'patterns', 'medications', 'experiments', 'questions'];

const build = (over: Partial<Parameters<typeof buildReport>[0]> = {}) =>
  buildReport({ entries: seed.entries, profile: seed.profile, experiments: seed.experiments, patterns, selectedPatternIds: [], rangeDays: 30, questions: ['¿Pregunta 1?'], now, ...over });

describe('reporte para el médico', () => {
  it('lleva el pie obligatorio y no usa lenguaje de diagnóstico ni causal', () => {
    const html = reportHtml(build(), ALL);
    expect(html).toContain('Registro generado por el paciente. No constituye diagnóstico.');
    expect(html).not.toMatch(/causa |provoca|diagnóstico de/i);
  });

  it('para el médico, en tercera persona y con coma decimal', () => {
    const d = build();
    expect(d.patterns.some((p) => p.statement.includes('de las molestias digestivas') || p.statement.includes('de los dolores de cabeza'))).toBe(true);
    expect(d.patterns.every((p) => !p.statement.includes(' tus '))).toBe(true);
    expect(reportHtml(d, ['summary'])).toMatch(/<td>\d+,\d<\/td>/);
  });

  it('sin selección incluye solo patrones Fuertes y Probables', () => {
    expect(build().patterns.every((p) => p.level !== 'possible')).toBe(true);
    expect(build().patterns.length).toBeGreaterThanOrEqual(2);
  });

  it('respeta los topes por sección (para caber en una página)', () => {
    const d = build({ questions: ['a', 'b', 'c', 'd', 'e', 'f'], selectedPatternIds: patterns.map((p) => p.id) });
    expect(d.patterns.length).toBeLessThanOrEqual(MAX.patterns);
    expect(d.questions.length).toBeLessThanOrEqual(MAX.questions);
    expect(d.medications.length).toBeLessThanOrEqual(MAX.medications);
    expect(d.timeline).toHaveLength(30);
  });

  it('el acetaminofén aparece con su alivio, sin evaluarlo', () => {
    const med = build().medications.find((m) => m.name.includes('Acetaminofén'));
    expect(med).toBeDefined();
    expect(med!.times).toBeGreaterThan(0);
  });

  it('escapa el texto escrito por la persona', () => {
    const html = reportHtml(build({ questions: ['<script>alert(1)</script>'] }), ALL);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
  });

  it('solo incluye las secciones elegidas', () => {
    const html = reportHtml(build(), ['summary']);
    expect(html).toContain('Resumen de episodios');
    expect(html).not.toContain('Preguntas para mi médico');
  });

  it('sugiere preguntas (no indicaciones)', () => {
    const qs = suggestedQuestions(patterns, build());
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) expect(q.trim().startsWith('¿')).toBe(true);
  });
});
