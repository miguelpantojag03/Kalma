/**
 * IA real (Google Gemini) con salvaguardas. La app nunca habla directo con Gemini ni tiene su llave:
 * llama a la Edge Function "ai" de Supabase, que guarda la llave como secreto.
 *
 * Qué decide la IA y qué no (D81):
 * - La IA SOLO interpreta los eventos (qué comió, qué sintió, cuándo, con qué intensidad).
 * - Las banderas rojas, el resumen y la pregunta de seguimiento se calculan aquí con reglas locales:
 *   la pantalla de emergencia nunca depende de un modelo ni de internet.
 * - Cada evento se valida con el mismo esquema que el analizador local; lo inválido se descarta.
 * - Si la IA falla, tarda más de 9 s, agota la cuota o no entiende nada que el analizador local sí
 *   entienda, se usa el analizador local. La persona siempre revisa y edita antes de guardar.
 */
import { format } from 'date-fns';
import { z } from 'zod';
import { buildFollowUp, extractEntry, summarize } from '@/mocks/extractEntry';
import { organizeVisit, type OrganizedVisit } from '@/mocks/organizeVisit';
import { detectRedFlags } from './redFlags';
import { ExtractedEventSchema, ExtractionSchema, type Extraction, type ExtractedEvent } from './schema';
import { supabase } from './supabase';

export type Engine = 'gemini' | 'local';
const TIMEOUT_MS = 9000;

/** Hora local con desfase ("2026-10-18T14:05:00-05:00"): así la IA ubica "a las 3" en el día correcto. */
export const localIso = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm:ssXXX");

type AiRequest =
  | { task: 'entry' | 'visit'; text: string }
  | { task: 'photo'; image: string; mimeType: string };

async function callAi(req: AiRequest, now: Date, timeoutMs = TIMEOUT_MS): Promise<unknown | null> {
  if (!supabase) return null;
  if (req.task !== 'photo' && req.text.length > 1500) return null;
  const call = supabase.functions.invoke('ai', { body: { ...req, now: localIso(now) } });
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    const res = await Promise.race([call, timeout]);
    if (!res || res.error || !res.data || typeof res.data !== 'object') return null;
    return (res.data as { result?: unknown }).result ?? null;
  } catch {
    return null;
  }
}

/** Arreglos menores antes de validar (lo que un modelo suele omitir o escribir distinto). */
function normalizeEvent(raw: unknown, offset: string): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const e = { ...(raw as Record<string, unknown>) };
  // Hora sin desfase → se asume la hora local de la persona
  if (typeof e.occurred_at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(e.occurred_at)) {
    e.occurred_at = `${e.occurred_at.length === 16 ? `${e.occurred_at}:00` : e.occurred_at}${offset}`;
  }
  if (typeof e.confidence !== 'number') e.confidence = 0.8;
  e.confidence = Math.min(1, Math.max(0, e.confidence as number));
  if (typeof e.source_text !== 'string') e.source_text = '';
  const data = e.data && typeof e.data === 'object' ? { ...(e.data as Record<string, unknown>) } : {};
  if ((e.type === 'food' || e.type === 'drink')) {
    if (typeof data.canonical_name !== 'string' && typeof data.name === 'string') data.canonical_name = data.name.toLowerCase();
    if (!Array.isArray(data.categories)) data.categories = [];
  }
  if (e.type === 'symptom' && typeof data.name === 'string') data.name = data.name.toLowerCase();
  e.data = data;
  return e;
}

/** Eventos válidos de la respuesta de la IA (los inválidos se descartan uno por uno). */
export function validEvents(result: unknown, now: Date): ExtractedEvent[] {
  const list = (result as { events?: unknown })?.events;
  if (!Array.isArray(list)) return [];
  const offset = format(now, 'XXX');
  return list
    .map((raw) => ExtractedEventSchema.safeParse(normalizeEvent(raw, offset)))
    .filter((r) => r.success)
    .map((r) => r.data);
}

/** Entiende un registro: Gemini si está disponible; si no, el analizador local. */
export async function understandEntry(text: string, recordedAt: Date): Promise<{ extraction: Extraction; engine: Engine }> {
  const local = () => extractEntry(text, { recordedAt: recordedAt.toISOString(), latencyMs: 0 });
  const result = await callAi({ task: 'entry', text }, recordedAt);
  const events = result ? validEvents(result, recordedAt) : [];
  if (events.length === 0) return { extraction: await local(), engine: 'local' };

  const red = detectRedFlags(text); // siempre local
  const unparsed = (result as { unparsed?: unknown }).unparsed;
  const extraction = ExtractionSchema.parse({
    summary: summarize(events),
    events,
    red_flag: { detected: red.detected, categories: red.categories, evidence: red.evidence },
    follow_up: buildFollowUp(events, red.detected),
    unparsed: typeof unparsed === 'string' && unparsed.trim() ? unparsed : null,
  });
  return { extraction, engine: 'gemini' };
}

const VisitSchema = z.object({
  diagnoses: z.array(z.string()).default([]),
  medications: z.array(z.object({ name: z.string(), dose: z.string().nullable().default(null), frequency: z.string().nullable().default(null) })).default([]),
  instructions: z.array(z.string()).default([]),
  followUps: z.array(z.object({ label: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null) })).default([]),
});

/** Ordena lo que dijo el médico: Gemini si está disponible; si no, el organizador local. */
export async function organizeVisitAI(text: string, base = new Date()): Promise<{ visit: OrganizedVisit; engine: Engine }> {
  const result = await callAi({ task: 'visit', text }, base);
  const parsed = result ? VisitSchema.safeParse(result) : null;
  const v = parsed?.success ? parsed.data : null;
  if (!v || v.diagnoses.length + v.medications.length + v.instructions.length + v.followUps.length === 0) {
    return { visit: await organizeVisit(text, base, 0), engine: 'local' };
  }
  return { visit: v, engine: 'gemini' };
}

/** Fotos de hasta ~4,5 MB (el límite de la función); más grandes no se envían. */
const MAX_IMAGE_B64 = 6_000_000;

/**
 * Reconoce una foto (plato, bebida o empaque de medicamento) con Gemini. Devuelve null si no hay IA,
 * falla o la foto no muestra nada registrable: en ese caso la app pide describirla por texto
 * (nunca inventa un plato). `seen` es lo que la IA dice que hay en la foto cuando no es comida.
 */
export async function understandPhoto(base64: string, mimeType: string, takenAt: Date): Promise<{ extraction: Extraction | null; seen: string | null; caption?: string | null }> {
  if (!base64 || base64.length > MAX_IMAGE_B64) return { extraction: null, seen: null };
  const result = await callAi({ task: 'photo', image: base64, mimeType }, takenAt, 20000);
  if (!result) return { extraction: null, seen: null };
  // Lo que Gemini describe que hay en la foto (se muestra en la confirmación: «Gemini vio: …»)
  const summary = (result as { summary?: unknown }).summary;
  const caption = typeof summary === 'string' && summary.trim() ? summary.trim() : null;
  const events = validEvents(result, takenAt).map((e) => ({ ...e, confidence: Math.min(e.confidence, 0.8), source_text: 'Reconocido en tu foto' }));
  const unparsed = (result as { unparsed?: unknown }).unparsed;
  const seen = typeof unparsed === 'string' && unparsed.trim() ? unparsed.trim() : null;
  if (events.length === 0) return { extraction: null, seen };
  const extraction = ExtractionSchema.parse({
    summary: summarize(events),
    events,
    red_flag: { detected: false, categories: [], evidence: null },
    follow_up: buildFollowUp(events, false),
    unparsed: null,
  });
  return { extraction, seen, caption };
}
