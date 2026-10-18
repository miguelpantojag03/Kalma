/**
 * Store de Kalma (Zustand + caché local en AsyncStorage), separado por ESPACIOS DE DATOS:
 *
 *  - 'demo'          → clave `kalma:demo`. Datos semilla de Laura. Solo en el dispositivo; NUNCA se
 *                      sincroniza con Supabase ni se mezcla con una cuenta real.
 *  - 'user:<uuid>'   → clave `kalma:user:<uuid>`. Caché local de la cuenta (funciona sin conexión) +
 *                      cola de sincronización (`outbox`) con lo creado o cambiado offline.
 *  - 'none'          → sin sesión (pantallas de bienvenida). Estado vacío en memoria.
 *
 * AuthProvider abre el espacio correcto con `openWorkspace()`; cerrar sesión borra la caché del usuario.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { EMPTY_CONSENT, EMPTY_PROFILE, generateSeed } from '@/mocks/seed';
import { uuid } from './id';
import type { Consent, DoctorVisit, Entry, Experiment, ExtractedEvent, Profile, StoredEvent } from './schema';

export type Workspace = 'none' | 'demo' | `user:${string}`;

export type SyncTable =
  | 'profiles' | 'consents' | 'conditions' | 'medications' | 'entries' | 'events'
  | 'daily_context' | 'pattern_flags' | 'experiments' | 'reports' | 'reminders' | 'doctors' | 'doctor_visits';

/** Operación pendiente de enviar a Supabase. `key` identifica la fila (sin user_id: lo pone el servidor). */
export interface SyncOp {
  id: string;
  table: SyncTable;
  kind: 'upsert' | 'delete';
  key: Record<string, string>;
  row?: Record<string, unknown>;
  at: string;
}

interface RemovedEvent {
  event: StoredEvent;
  entryId: string;
  index: number;
  /** Si al quitar el evento la entrada quedó vacía, se borra y se guarda aquí para poder deshacer. */
  entrySnapshot: Entry | null;
}

export interface KalmaData {
  profile: Profile;
  consent: Consent;
  entries: Entry[];
  experiments: Experiment[];
  /** Patrones que la persona marcó como "no me parece útil" (ids del motor de patrones). */
  dismissedPatterns: string[];
  /** Patrones elegidos para el reporte del médico. */
  reportPatterns: string[];
  /** Patrones que la persona ya abrió (los demás se marcan "Nuevo"). */
  seenPatterns: string[];
  /** Visitas al médico organizadas ("Volví del médico"). */
  doctorVisits: DoctorVisit[];
  /** Cola de sincronización (solo se usa en espacios de usuario). */
  outbox: SyncOp[];
}

export interface KalmaState extends KalmaData {
  workspace: Workspace;
  /** Último evento quitado, para "Deshacer" (no se persiste). */
  lastRemoved: RemovedEvent | null;
  /** true cuando la caché del espacio ya cargó (evita mostrar estados vacíos falsos al abrir). */
  hydrated: boolean;

  addEntry: (input: { transcript: string; summary: string; source: Entry['source']; events: ExtractedEvent[]; recordedAt?: string }) => Entry;
  updateEvent: (eventId: string, patch: Partial<Pick<StoredEvent, 'occurred_at' | 'occurred_at_precision'>> & { data?: Record<string, unknown> }) => void;
  removeEvent: (eventId: string) => void;
  undoRemove: () => void;
  removeEntry: (entryId: string) => void;

  updateProfile: (patch: Partial<Profile>) => void;
  setConsent: (key: 'health' | 'ai' | 'location', value: boolean) => void;

  startExperiment: (e: Omit<Experiment, 'id' | 'adherence' | 'status'>) => void;
  logAdherence: (experimentId: string, day: string, done: boolean) => void;
  endExperiment: (experimentId: string, status: 'finished' | 'cancelled') => void;

  addDoctorVisit: (v: Omit<DoctorVisit, 'id'>) => DoctorVisit;
  removeDoctorVisit: (id: string) => void;

  togglePatternDismissed: (patternId: string) => void;
  togglePatternInReport: (patternId: string) => void;
  markPatternSeen: (patternId: string) => void;

  /** Solo en modo demo: vuelve a cargar los 45 días de Laura. */
  resetDemo: () => void;
  /** Deja el espacio actual vacío (pruebas internas y "empezar de cero" de la demo). */
  startFresh: () => void;
  /** Borra los datos locales del espacio actual. */
  wipeAll: () => void;

  enqueue: (ops: Omit<SyncOp, 'id' | 'at'>[]) => void;
  dequeue: (ids: string[]) => void;
}

function demoData(): Omit<KalmaData, 'outbox'> {
  const s = generateSeed();
  return { profile: s.profile, consent: s.consent, entries: s.entries, experiments: s.experiments, dismissedPatterns: [], reportPatterns: [], seenPatterns: [], doctorVisits: [] };
}

export function emptyData(): KalmaData {
  return { profile: EMPTY_PROFILE, consent: EMPTY_CONSENT, entries: [], experiments: [], dismissedPatterns: [], reportPatterns: [], seenPatterns: [], doctorVisits: [], outbox: [] };
}

const mapEvents = (entries: Entry[], fn: (e: StoredEvent) => StoredEvent) =>
  entries.map((en) => ({ ...en, events: en.events.map(fn) }));

/** Clave descartable: mientras se cambia de espacio, las escrituras de persist caen aquí y no pisan datos reales. */
const SCRATCH_KEY = 'kalma:__switching__';
export const storageKey = (ws: Workspace) => (ws === 'demo' ? 'kalma:demo' : ws === 'none' ? SCRATCH_KEY : `kalma:${ws}`);

export const useKalma = create<KalmaState>()(
  persist(
    (set, get) => ({
      ...emptyData(),
      workspace: 'none' as Workspace,
      lastRemoved: null,
      hydrated: false,

      addEntry: ({ transcript, summary, source, events, recordedAt }) => {
        const id = uuid();
        const entry: Entry = {
          id,
          recordedAt: recordedAt ?? new Date().toISOString(),
          source,
          transcript,
          summary,
          events: events.map((e, i) => ({ ...e, id: `${id}-${i}`, entryId: id, edited: false })),
        };
        set((s) => ({ entries: [...s.entries, entry].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)) }));
        return entry;
      },

      updateEvent: (eventId, patch) =>
        set((s) => ({
          entries: mapEvents(s.entries, (e) =>
            e.id === eventId
              ? ({ ...e, ...patch, data: patch.data ? { ...e.data, ...patch.data } : e.data, edited: true } as StoredEvent)
              : e,
          ),
        })),

      removeEvent: (eventId) => {
        const entries = get().entries;
        for (const en of entries) {
          const index = en.events.findIndex((e) => e.id === eventId);
          if (index === -1) continue;
          const event = en.events[index]!;
          const emptied = en.events.length === 1;
          set({
            lastRemoved: { event, entryId: en.id, index, entrySnapshot: emptied ? en : null },
            entries: emptied
              ? entries.filter((x) => x.id !== en.id)
              : entries.map((x) => (x.id === en.id ? { ...x, events: x.events.filter((e) => e.id !== eventId) } : x)),
          });
          return;
        }
      },

      undoRemove: () => {
        const r = get().lastRemoved;
        if (!r) return;
        set((s) => {
          if (r.entrySnapshot) {
            const entries = [...s.entries, r.entrySnapshot].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
            return { entries, lastRemoved: null };
          }
          const entries = s.entries.map((x) => {
            if (x.id !== r.entryId) return x;
            const events = [...x.events];
            events.splice(r.index, 0, r.event);
            return { ...x, events };
          });
          return { entries, lastRemoved: null };
        });
      },

      removeEntry: (entryId) => set((s) => ({ entries: s.entries.filter((e) => e.id !== entryId) })),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      setConsent: (key, value) =>
        set((s) => ({ consent: { ...s.consent, [key]: value, updatedAt: { ...s.consent.updatedAt, [key]: new Date().toISOString() } } })),

      startExperiment: (e) => set((s) => ({ experiments: [...s.experiments, { ...e, id: uuid(), adherence: {}, status: 'active' }] })),

      logAdherence: (experimentId, day, done) =>
        set((s) => ({
          experiments: s.experiments.map((x) => (x.id === experimentId ? { ...x, adherence: { ...x.adherence, [day]: done } } : x)),
        })),

      endExperiment: (experimentId, status) =>
        set((s) => ({ experiments: s.experiments.map((x) => (x.id === experimentId ? { ...x, status } : x)) })),

      addDoctorVisit: (v) => {
        const visit = { ...v, id: uuid() };
        set((s) => ({ doctorVisits: [...s.doctorVisits, visit].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)) }));
        return visit;
      },
      removeDoctorVisit: (id) => set((s) => ({ doctorVisits: s.doctorVisits.filter((v) => v.id !== id) })),

      togglePatternDismissed: (id) =>
        set((s) => ({
          dismissedPatterns: s.dismissedPatterns.includes(id) ? s.dismissedPatterns.filter((x) => x !== id) : [...s.dismissedPatterns, id],
        })),

      togglePatternInReport: (id) =>
        set((s) => ({
          reportPatterns: s.reportPatterns.includes(id) ? s.reportPatterns.filter((x) => x !== id) : [...s.reportPatterns, id],
        })),

      markPatternSeen: (id) => set((s) => (s.seenPatterns.includes(id) ? s : { seenPatterns: [...s.seenPatterns, id] })),

      resetDemo: () => set({ ...demoData(), outbox: [], lastRemoved: null }),
      startFresh: () => set({ ...emptyData(), lastRemoved: null }),
      wipeAll: () => set({ ...emptyData(), lastRemoved: null }),

      enqueue: (ops) =>
        set((s) => ({ outbox: [...s.outbox, ...ops.map((o) => ({ ...o, id: uuid(), at: new Date().toISOString() }))] })),
      dequeue: (ids) => set((s) => ({ outbox: s.outbox.filter((o) => !ids.includes(o.id)) })),
    }),
    {
      name: SCRATCH_KEY,
      version: 4,
      // Se hidrata a mano al abrir un espacio (AuthProvider), nunca automáticamente.
      skipHydration: true,
      // v1 → v2: seenPatterns · v2 → v3: outbox · v3 → v4: doctorVisits
      migrate: (persisted) => ({ seenPatterns: [], outbox: [], doctorVisits: [], ...(persisted as object) }) as unknown as KalmaState,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ lastRemoved: _l, hydrated: _h, workspace: _w, ...rest }) => rest,
    },
  ),
);

/* ---------- espacios de datos ---------- */

const LEGACY_KEY = 'kalma-data';

/** Los datos de versiones anteriores (todo era demo) pasan una sola vez al espacio demo. */
async function migrateLegacy() {
  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (!legacy) return;
  if (!(await AsyncStorage.getItem('kalma:demo'))) await AsyncStorage.setItem('kalma:demo', legacy);
  await AsyncStorage.removeItem(LEGACY_KEY);
}

/** Abre un espacio de datos: carga su caché local (y la semilla si es la demo y está vacía). */
export async function openWorkspace(ws: Workspace) {
  await migrateLegacy();
  // 1) Las escrituras mientras se limpia la memoria caen en la clave descartable
  useKalma.persist.setOptions({ name: SCRATCH_KEY });
  useKalma.setState({ ...emptyData(), lastRemoved: null, hydrated: false, workspace: ws });
  if (ws !== 'none') {
    // 2) Ahora sí, la clave del espacio y su caché
    const existed = (await AsyncStorage.getItem(storageKey(ws))) !== null;
    useKalma.persist.setOptions({ name: storageKey(ws) });
    await useKalma.persist.rehydrate();
    // La semilla se carga solo la primera vez (si alguien vacía la demo, se respeta).
    if (ws === 'demo' && !existed) useKalma.getState().resetDemo();
  }
  useKalma.setState({ hydrated: true, workspace: ws });
}

/** Cierra el espacio actual. Con `wipe`, borra su caché local (cerrar sesión / eliminar cuenta). */
export async function closeWorkspace({ wipe }: { wipe: boolean }) {
  const ws = useKalma.getState().workspace;
  await openWorkspace('none');
  if (wipe && ws !== 'none') await AsyncStorage.removeItem(storageKey(ws));
  await AsyncStorage.removeItem(SCRATCH_KEY);
}
