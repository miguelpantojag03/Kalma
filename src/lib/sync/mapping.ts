/**
 * Mapeo entre el store local y las tablas de Supabase (y de vuelta).
 * Puro y sin red: se prueba en Jest.
 */
import { dayKey } from '../dates';
import type { DoctorVisit, Entry, Experiment, Profile, StoredEvent } from '../schema';
import type { KalmaData, SyncTable } from '../store';

export type Row = Record<string, unknown>;
export type Tables = Record<Exclude<SyncTable, 'reports'>, Row[]>;

/** Columnas que identifican una fila (sin user_id: RLS ya filtra por usuario). */
export const KEY_COLUMNS: Record<SyncTable, string[]> = {
  profiles: [],
  consents: [],
  conditions: ['name'],
  medications: ['name'],
  entries: ['id'],
  events: ['id'],
  daily_context: ['day'],
  pattern_flags: ['pattern_id'],
  experiments: ['id'],
  reports: ['id'],
  reminders: ['kind'],
  doctors: ['name'],
  doctor_visits: ['id'],
};

/** Columnas de conflicto para upsert (incluyen user_id cuando la clave es compuesta). */
export const ON_CONFLICT: Record<SyncTable, string> = {
  profiles: 'user_id',
  consents: 'user_id',
  conditions: 'user_id,name',
  medications: 'user_id,name',
  entries: 'id',
  events: 'id',
  daily_context: 'user_id,day',
  pattern_flags: 'user_id,pattern_id',
  experiments: 'id',
  reports: 'id',
  reminders: 'user_id,kind',
  doctors: 'user_id,name',
  doctor_visits: 'id',
};

/** Orden de escritura (padres antes que hijos). Los borrados van en orden inverso. */
export const TABLE_ORDER: SyncTable[] = [
  'profiles', 'consents', 'conditions', 'medications', 'entries', 'events',
  'daily_context', 'pattern_flags', 'experiments', 'reports', 'reminders', 'doctors', 'doctor_visits',
];

export const rowKey = (table: SyncTable, row: Row) => KEY_COLUMNS[table].map((c) => String(row[c])).join('|') || '_';
export const keyOf = (table: SyncTable, row: Row): Record<string, string> =>
  Object.fromEntries(KEY_COLUMNS[table].map((c) => [c, String(row[c])]));

/** Resumen diario a partir de los check-ins (lo que se guarda en daily_context). */
function dailyContext(entries: Entry[], userId: string): Row[] {
  const byDay = new Map<string, Row>();
  for (const en of entries) {
    if (en.source !== 'checkin') continue;
    const day = dayKey(en.recordedAt);
    const row = byDay.get(day) ?? { user_id: userId, day, sleep_hours: null, stress: null, mood: null, water_glasses: null, checkin_done: true };
    for (const e of en.events) {
      if (e.type === 'sleep') row.sleep_hours = e.data.hours;
      if (e.type === 'stress') row.stress = e.data.level_0_10;
      if (e.type === 'mood') row.mood = e.data.level_0_10;
      if (e.type === 'water') row.water_glasses = e.data.glasses;
    }
    byDay.set(day, row);
  }
  return [...byDay.values()];
}

export function toRows(d: Pick<KalmaData, 'profile' | 'consent' | 'entries' | 'experiments' | 'dismissedPatterns' | 'reportPatterns' | 'seenPatterns'> & { doctorVisits?: DoctorVisit[] }, userId: string): Tables {
  const p = d.profile;
  const flags = new Set([...d.dismissedPatterns, ...d.reportPatterns, ...d.seenPatterns]);
  return {
    profiles: [{
      user_id: userId, name: p.name, goals: p.goals, reminder_time: p.reminderTime,
      caregiver_enabled: p.caregiver.enabled, caregiver_name: p.caregiver.personName, onboarded: p.onboarded,
      tracks_cycle: !!p.tracksCycle,
    }],
    consents: [{ user_id: userId, health: d.consent.health, ai: d.consent.ai, location: d.consent.location, changed_at: d.consent.updatedAt }],
    conditions: p.conditions.map((name) => ({ user_id: userId, name })),
    medications: p.medications.map((m) => ({ user_id: userId, name: m.name, generic_name: m.generic_name, use: m.use })),
    entries: d.entries.map((e) => ({ id: e.id, user_id: userId, recorded_at: e.recordedAt, source: e.source, transcript: e.transcript, summary: e.summary })),
    events: d.entries.flatMap((en) =>
      en.events.map((e) => ({
        id: e.id, user_id: userId, entry_id: en.id, type: e.type, occurred_at: e.occurred_at,
        occurred_at_precision: e.occurred_at_precision, confidence: e.confidence, source_text: e.source_text, data: e.data, edited: e.edited,
      })),
    ),
    daily_context: dailyContext(d.entries, userId),
    pattern_flags: [...flags].map((id) => ({
      user_id: userId, pattern_id: id, dismissed: d.dismissedPatterns.includes(id), in_report: d.reportPatterns.includes(id), seen: d.seenPatterns.includes(id),
    })),
    experiments: d.experiments.map((x) => ({
      id: x.id, user_id: userId, title: x.title, factor: x.factor, duration_days: x.durationDays, start_date: x.startDate, adherence: x.adherence, status: x.status, outcome: x.outcome ?? 'dolor de cabeza',
    })),
    reminders: [{ user_id: userId, kind: 'checkin', time: p.reminderTime, enabled: true }],
    doctors: p.doctors.map((doc) => ({ user_id: userId, name: doc.name, specialty: doc.specialty })),
    doctor_visits: (d.doctorVisits ?? []).map((v) => ({
      id: v.id, user_id: userId, visited_at: v.visitedAt, doctor: v.doctor, transcript: v.transcript,
      data: { diagnoses: v.diagnoses, medications: v.medications, instructions: v.instructions, followUps: v.followUps },
    })),
  };
}

/** De las tablas descargadas al formato del store (al iniciar sesión en un dispositivo). */
export function fromRows(t: Partial<Tables>): Omit<KalmaData, 'outbox'> {
  const prof = t.profiles?.[0] ?? {};
  const cons = t.consents?.[0] ?? {};
  const profile: Profile = {
    name: String(prof.name ?? ''),
    conditions: (t.conditions ?? []).map((r) => String(r.name)),
    goals: (prof.goals as string[]) ?? [],
    medications: (t.medications ?? []).map((r) => ({ name: String(r.name), generic_name: (r.generic_name as string) ?? null, use: (r.use as Profile['medications'][number]['use']) ?? 'rescue' })),
    doctors: (t.doctors ?? []).map((r) => ({ name: String(r.name), specialty: String(r.specialty ?? '') })),
    reminderTime: String(prof.reminder_time ?? '21:00'),
    caregiver: { enabled: !!prof.caregiver_enabled, personName: (prof.caregiver_name as string) ?? null },
    onboarded: !!prof.onboarded,
    tracksCycle: !!prof.tracks_cycle,
  };
  const eventsByEntry = new Map<string, StoredEvent[]>();
  for (const r of t.events ?? []) {
    const ev = {
      id: String(r.id), entryId: String(r.entry_id), type: r.type, occurred_at: (r.occurred_at as string) ?? null,
      occurred_at_precision: r.occurred_at_precision, confidence: Number(r.confidence), source_text: String(r.source_text ?? ''),
      data: r.data, edited: !!r.edited,
    } as StoredEvent;
    const list = eventsByEntry.get(ev.entryId) ?? [];
    list.push(ev);
    eventsByEntry.set(ev.entryId, list);
  }
  // Orden estable de los eventos dentro de cada registro (id = "<entry>-<i>")
  for (const list of eventsByEntry.values()) list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  const entries: Entry[] = (t.entries ?? [])
    .map((r) => ({
      id: String(r.id), recordedAt: new Date(String(r.recorded_at)).toISOString(), source: r.source as Entry['source'],
      transcript: String(r.transcript ?? ''), summary: String(r.summary ?? ''), events: eventsByEntry.get(String(r.id)) ?? [],
    }))
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const flags = t.pattern_flags ?? [];
  return {
    profile,
    consent: { health: !!cons.health, ai: !!cons.ai, location: !!cons.location, updatedAt: (cons.changed_at as Record<string, string>) ?? {} },
    entries,
    experiments: (t.experiments ?? []).map((r) => ({
      id: String(r.id), title: String(r.title), factor: String(r.factor), durationDays: Number(r.duration_days) as Experiment['durationDays'],
      startDate: String(r.start_date), adherence: (r.adherence as Record<string, boolean>) ?? {}, status: r.status as Experiment['status'],
      outcome: String(r.outcome ?? 'dolor de cabeza'),
    })),
    doctorVisits: (t.doctor_visits ?? [])
      .map((r) => {
        const data = (r.data ?? {}) as Partial<DoctorVisit>;
        return {
          id: String(r.id), visitedAt: new Date(String(r.visited_at)).toISOString(), doctor: (r.doctor as string) ?? null, transcript: String(r.transcript ?? ''),
          diagnoses: data.diagnoses ?? [], medications: data.medications ?? [], instructions: data.instructions ?? [], followUps: data.followUps ?? [],
        };
      })
      .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)),
    dismissedPatterns: flags.filter((f) => f.dismissed).map((f) => String(f.pattern_id)),
    reportPatterns: flags.filter((f) => f.in_report).map((f) => String(f.pattern_id)),
    seenPatterns: flags.filter((f) => f.seen).map((f) => String(f.pattern_id)),
  };
}

/** Diferencias entre dos fotos de las tablas → operaciones de sincronización. */
export function diffTables(prev: Tables, next: Tables) {
  const ops: { table: SyncTable; kind: 'upsert' | 'delete'; key: Record<string, string>; row?: Row }[] = [];
  for (const table of Object.keys(next) as (keyof Tables)[]) {
    const before = new Map(prev[table].map((r) => [rowKey(table, r), r]));
    const after = new Map(next[table].map((r) => [rowKey(table, r), r]));
    for (const [k, row] of after) {
      const old = before.get(k);
      if (!old || JSON.stringify(old) !== JSON.stringify(row)) ops.push({ table, kind: 'upsert', key: keyOf(table, row), row });
    }
    for (const [k, row] of before) if (!after.has(k)) ops.push({ table, kind: 'delete', key: keyOf(table, row) });
  }
  return ops;
}
