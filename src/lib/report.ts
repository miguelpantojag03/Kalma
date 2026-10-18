/**
 * Reporte para el médico: datos + HTML de UNA página A4.
 * Topes por sección para que siempre quepa en una página (verificado renderizando el PDF).
 * Pie obligatorio: "Registro generado por el paciente. No constituye diagnóstico."
 */
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { dayKey } from './dates';
import { intensityIndex } from './intensity';
import { experimentResult, type Pattern } from './patterns';
import type { Entry, Experiment, Profile, StoredEvent } from './schema';
import { allEvents, dayStatus, eventsByDay, recordedDays } from './selectors';
import { light } from '@/theme/tokens';
import { PATTERN_LEVEL_LABEL } from './types';

export type ReportSection = 'summary' | 'timeline' | 'patterns' | 'medications' | 'experiments' | 'questions';

export const SECTION_LABEL: Record<ReportSection, string> = {
  summary: 'Resumen de episodios',
  timeline: 'Línea de tiempo',
  patterns: 'Patrones encontrados',
  medications: 'Medicamentos de rescate y alivio',
  experiments: 'Experimentos',
  questions: 'Preguntas para mi médico',
};

export const MAX = { patterns: 3, medications: 3, questions: 4, symptoms: 4 } as const;

export interface ReportData {
  patient: string;
  conditions: string[];
  from: Date;
  to: Date;
  daysRecorded: number;
  daysInRange: number;
  symptoms: { name: string; days: number; avg: number | null; max: number | null }[];
  timeline: { key: string; label: string; max: number | null | undefined }[];
  patterns: Pick<Pattern, 'level' | 'statement' | 'evidence'>[];
  medications: { name: string; times: number; full: number; partial: number; none: number; unknown: number }[];
  /** Días del periodo con algún medicamento para el dolor (dato útil para el médico: uso frecuente). */
  medicationDays: number;
  experiments: { title: string; status: string; summary: string }[];
  questions: string[];
  generatedAt: Date;
}

export function buildReport(opts: {
  entries: Entry[];
  profile: Profile;
  experiments: Experiment[];
  patterns: Pattern[];
  selectedPatternIds: string[];
  rangeDays: number;
  questions: string[];
  now?: Date;
}): ReportData {
  const now = opts.now ?? new Date();
  const from = subDays(now, opts.rangeDays - 1);
  const keys = Array.from({ length: opts.rangeDays }, (_, i) => dayKey(subDays(now, opts.rangeDays - 1 - i)));
  const keySet = new Set(keys);
  const inRange = (e: StoredEvent) => !!e.occurred_at && keySet.has(dayKey(e.occurred_at));
  const events = allEvents(opts.entries).filter(inRange);
  const byDay = eventsByDay(opts.entries);
  const recorded = [...recordedDays(opts.entries)].filter((k) => keySet.has(k)).length;

  // Síntomas: días con el síntoma, intensidad promedio y máxima
  const byName = new Map<string, { days: Set<string>; values: number[] }>();
  for (const e of events) {
    if (e.type !== 'symptom') continue;
    const s = byName.get(e.data.name) ?? { days: new Set(), values: [] };
    s.days.add(dayKey(e.occurred_at!));
    if (e.data.intensity_0_10 !== null) s.values.push(e.data.intensity_0_10);
    byName.set(e.data.name, s);
  }
  const symptoms = [...byName.entries()]
    .map(([name, s]) => ({
      name,
      days: s.days.size,
      avg: s.values.length ? Math.round((s.values.reduce((x, y) => x + y, 0) / s.values.length) * 10) / 10 : null,
      max: s.values.length ? Math.max(...s.values) : null,
    }))
    .sort((a, b) => b.days - a.days)
    .slice(0, MAX.symptoms);

  // Medicamentos (solo se informan; Kalma no los evalúa ni sugiere)
  const meds = new Map<string, ReportData['medications'][number]>();
  for (const e of events) {
    if (e.type !== 'medication') continue;
    const m = meds.get(e.data.name) ?? { name: e.data.name, times: 0, full: 0, partial: 0, none: 0, unknown: 0 };
    m.times++;
    m[e.data.relief ?? 'unknown']++;
    meds.set(e.data.name, m);
  }

  // Patrones: los que la persona eligió; si no eligió, los Fuertes y Probables
  const chosen = opts.selectedPatternIds.length
    ? opts.patterns.filter((p) => opts.selectedPatternIds.includes(p.id))
    : opts.patterns.filter((p) => p.level !== 'possible');

  const experiments = opts.experiments.slice(0, 2).map((x) => {
    const r = experimentResult(opts.entries, x.startDate, x.durationDays, x.adherence, 'dolor de cabeza');
    const pct = (v: number) => `${Math.round(v * 100)} %`;
    return {
      title: x.title,
      status: x.status === 'finished' ? 'Terminado' : x.status === 'active' ? 'En curso' : 'Cancelado',
      summary: r.enoughData
        ? `Días con dolor de cabeza: ${pct(r.before.rate)} antes · ${pct(r.during.rate)} durante (cumplido ${pct(r.during.adherence)} de los días).`
        : 'Aún sin datos suficientes para comparar.',
    };
  });

  return {
    patient: opts.profile.name || 'Paciente',
    conditions: opts.profile.conditions,
    from,
    to: now,
    daysRecorded: recorded,
    daysInRange: opts.rangeDays,
    symptoms,
    timeline: keys.map((k) => ({ key: k, label: format(new Date(`${k}T12:00:00`), 'd', { locale: es }), max: dayStatus(byDay, k) })),
    // En el reporte (para el médico) en tercera persona: "de tus molestias" → "de las molestias"
    patterns: chosen.slice(0, MAX.patterns).map(({ level, statement, evidence }) => ({ level, statement: toThirdPerson(statement), evidence })),
    medications: [...meds.values()].sort((a, b) => b.times - a.times).slice(0, MAX.medications),
    medicationDays: keys.filter((k) => (byDay.get(k) ?? []).some((e) => e.type === 'medication')).length,
    experiments,
    questions: opts.questions.filter((q) => q.trim()).slice(0, MAX.questions),
    generatedAt: now,
  };
}

export const toThirdPerson = (s: string) => s.replace(/de tus (\S+)/, (_m, w: string) => `de ${/as$/.test(w) ? 'las' : 'los'} ${w}`);
const dec = (n: number | null) => (n === null ? '—' : String(n).replace('.', ','));

/** Preguntas sugeridas a partir de lo encontrado (la persona las edita). Son preguntas, nunca indicaciones. */
export function suggestedQuestions(patterns: Pattern[], data: Pick<ReportData, 'medications'>): string[] {
  const q: string[] = [];
  const top = patterns.find((p) => p.level !== 'possible');
  if (top) q.push(`¿Puede tener relación lo que encontré (${top.factorShort.toLowerCase()} y ${top.outcome})?`);
  if (data.medications.some((m) => m.none + m.partial > 0)) q.push('¿Qué hago cuando el medicamento de rescate no me alivia del todo?');
  q.push('¿Hay algo más que debería registrar antes del próximo control?');
  return q.slice(0, MAX.questions);
}

/* ---------- HTML ---------- */

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const RELIEF_TEXT = (m: ReportData['medications'][number]) =>
  [m.full && `${m.full} alivio total`, m.partial && `${m.partial} parcial`, m.none && `${m.none} sin alivio`, m.unknown && `${m.unknown} sin dato`].filter(Boolean).join(' · ');

function timelineSvg(t: ReportData['timeline']) {
  const w = 520, h = 70, gap = 2;
  const bw = (w - gap * (t.length - 1)) / t.length;
  const bars = t.map((d, i) => {
    const x = i * (bw + gap);
    if (d.max === null) return `<rect x="${x}" y="${h - 6}" width="${bw}" height="4" fill="none" stroke="#7A8B87" stroke-dasharray="2 1"/>`;
    if (d.max === undefined) return `<rect x="${x}" y="${h - 4}" width="${bw}" height="3" fill="#CCE3DE"/>`;
    const bh = 6 + (d.max / 10) * (h - 18);
    const color = light.intensity[intensityIndex(d.max)];
    return `<rect x="${x}" y="${h - bh}" width="${bw}" height="${bh}" rx="1.5" fill="${color}" stroke="#1F2A2E" stroke-width="0.3"/>${bw > 9 ? `<text x="${x + bw / 2}" y="${h - bh - 2}" font-size="7" text-anchor="middle" fill="#1F2A2E">${d.max}</text>` : ''}`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img" aria-label="Intensidad máxima de síntomas por día">${bars.join('')}</svg>`;
}

export function reportHtml(d: ReportData, sections: ReportSection[]): string {
  const has = (s: ReportSection) => sections.includes(s);
  const range = `${format(d.from, "d 'de' MMMM", { locale: es })} al ${format(d.to, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
  const block = (title: string, body: string) => `<section><h2>${title}</h2>${body}</section>`;

  const summary = d.symptoms.length
    ? `<table><tr><th>Síntoma</th><th>Días</th><th>Prom.</th><th>Máx.</th></tr>${d.symptoms
        .map((s) => `<tr><td>${esc(s.name.charAt(0).toUpperCase() + s.name.slice(1))}</td><td>${s.days}</td><td>${dec(s.avg)}</td><td>${dec(s.max)}</td></tr>`)
        .join('')}</table><p class="muted">Intensidad de 0 a 10 reportada por el paciente.</p>`
    : '<p class="muted">Sin síntomas registrados en el periodo.</p>';

  const patterns = d.patterns.length
    ? d.patterns.map((p) => `<div class="pat"><span class="lvl lvl-${p.level}">${PATTERN_LEVEL_LABEL[p.level]}</span> ${esc(p.statement)} <span class="muted">(${esc(p.evidence)})</span></div>`).join('') +
      '<p class="muted">Asociaciones en los datos del paciente (prueba exacta de Fisher con corrección de Benjamini–Hochberg). No implican causalidad.</p>'
    : '<p class="muted">Sin patrones con datos suficientes.</p>';

  const meds = d.medications.length
    ? `<ul>${d.medications.map((m) => `<li><b>${esc(m.name)}</b>: ${m.times} ${m.times === 1 ? 'vez' : 'veces'} · ${RELIEF_TEXT(m)}</li>`).join('')}</ul><p class="muted">Días con medicamento en el periodo: ${d.medicationDays} de ${d.daysInRange}.</p>`
    : '<p class="muted">Sin medicamentos registrados.</p>';

  const exps = d.experiments.length
    ? `<ul>${d.experiments.map((x) => `<li><b>${esc(x.title)}</b> (${x.status}). ${esc(x.summary)}</li>`).join('')}</ul>`
    : '<p class="muted">Sin experimentos.</p>';

  const questions = d.questions.length ? `<ol>${d.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>` : '<p class="muted">—</p>';

  return `<!doctype html><html lang="es-CO"><head><meta charset="utf-8"><title>Reporte de ${esc(d.patient)}</title>
<style>
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { font-family: -apple-system, Roboto, "Segoe UI", Arial, sans-serif; color: #1F2A2E; font-size: 10pt; line-height: 1.35; margin: 0; }
header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4F7566; padding-bottom: 6px; margin-bottom: 8px; }
h1 { font-size: 15pt; margin: 0; color: #4F7566; }
h2 { font-size: 10.5pt; margin: 0 0 4px; color: #4F7566; text-transform: uppercase; letter-spacing: .04em; }
section { margin-bottom: 9px; break-inside: avoid; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.muted { color: #5F6E73; font-size: 8.5pt; margin: 2px 0 0; }
table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
th, td { text-align: left; padding: 2px 4px; border-bottom: 1px solid #DDE7E3; }
th { color: #5F6E73; font-weight: 600; }
ul, ol { margin: 0; padding-left: 16px; } li { margin-bottom: 2px; }
.pat { margin-bottom: 4px; }
.lvl { display: inline-block; font-size: 8pt; font-weight: 700; padding: 0 6px; border-radius: 8px; border: 1px solid #4F7566; }
.lvl-strong { background: #4F7566; color: #fff; } .lvl-probable { background: #CCE3DE; } .lvl-possible { background: #fff; }
.legend { font-size: 8pt; color: #5F6E73; }
footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #DDE7E3; padding-top: 4px; font-size: 8.5pt; color: #5F6E73; display: flex; justify-content: space-between; }
</style></head><body>
<header>
  <div><h1>Kalma · Reporte para consulta</h1><div><b>${esc(d.patient)}</b>${d.conditions.length ? ` · ${esc(d.conditions.join(', '))}` : ''}</div></div>
  <div style="text-align:right">${range}<br><span class="muted">${d.daysRecorded} de ${d.daysInRange} días con registros</span></div>
</header>
${has('timeline') ? block('Línea de tiempo · intensidad máxima diaria (0–10)', `${timelineSvg(d.timeline)}<div class="legend">Color y altura = intensidad máxima del día · línea punteada = día sin registro</div>`) : ''}
<div class="grid">
  <div>
    ${has('summary') ? block('Resumen de episodios', summary) : ''}
    ${has('medications') ? block('Medicamentos de rescate y alivio', meds) : ''}
    ${has('experiments') ? block('Experimentos', exps) : ''}
  </div>
  <div>
    ${has('patterns') ? block('Patrones encontrados', patterns) : ''}
    ${has('questions') ? block('Preguntas para mi médico', questions) : ''}
  </div>
</div>
<footer><span><b>Registro generado por el paciente. No constituye diagnóstico.</b></span><span>Generado con Kalma el ${format(d.generatedAt, "d 'de' MMMM 'de' yyyy", { locale: es })}</span></footer>
</body></html>`;
}
