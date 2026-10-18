/**
 * Motor de sincronización (solo para cuentas reales; la demo nunca llega aquí).
 *
 *  - Cada cambio del store en un espacio de usuario se traduce en operaciones (diff) que van a una
 *    cola persistente (`outbox`). Funciona sin conexión: la cola se envía cuando vuelve internet,
 *    al volver la app a primer plano y cada cierto tiempo.
 *  - Al iniciar sesión: primero se envía lo pendiente y luego se descargan los datos de la cuenta.
 *  - Las operaciones se compactan (la última por fila gana) y se aplican en orden padres → hijos.
 */
import { AppState, type NativeEventSubscription } from 'react-native';
import { addNetworkStateListener } from 'expo-network';
import { supabase } from '../supabase';
import { useKalma, type KalmaState, type SyncOp, type SyncTable } from '../store';
import { diffTables, fromRows, ON_CONFLICT, TABLE_ORDER, toRows, type Row, type Tables } from './mapping';

let userId: string | null = null;
let applyingRemote = false;
let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const cleanups: (() => void)[] = [];

const DATA_KEYS = ['profile', 'consent', 'entries', 'experiments', 'dismissedPatterns', 'reportPatterns', 'seenPatterns', 'doctorVisits'] as const;
const dataChanged = (a: KalmaState, b: KalmaState) => DATA_KEYS.some((k) => a[k] !== b[k]);

/** Empieza a escuchar cambios del store del usuario y a enviarlos. */
export function startSync(uid: string) {
  stopSync();
  userId = uid;
  const unsub = useKalma.subscribe((s, prev) => {
    if (applyingRemote || !s.hydrated || !prev.hydrated) return;
    if (s.workspace !== `user:${uid}` || prev.workspace !== s.workspace) return;
    if (!dataChanged(s, prev)) return;
    const ops = diffTables(toRows(prev, uid), toRows(s, uid));
    if (ops.length) {
      useKalma.getState().enqueue(ops);
      scheduleFlush(300);
    }
  });
  cleanups.push(unsub);
  const net = addNetworkStateListener((st) => {
    if (st.isConnected && st.isInternetReachable !== false) scheduleFlush(500);
  });
  cleanups.push(() => net?.remove?.());
  const app: NativeEventSubscription = AppState.addEventListener('change', (st) => {
    if (st === 'active') scheduleFlush(500);
  });
  cleanups.push(() => app?.remove?.());
  scheduleFlush(0);
}

export function stopSync() {
  while (cleanups.length) cleanups.pop()!();
  if (timer) clearTimeout(timer);
  timer = null;
  userId = null;
}

function scheduleFlush(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), ms);
}

/** Compacta la cola: por cada fila queda la última operación. */
export function compact(ops: SyncOp[]): SyncOp[] {
  const last = new Map<string, SyncOp>();
  for (const op of ops) last.set(`${op.table}|${JSON.stringify(op.key)}`, op);
  return [...last.values()];
}

/** Envía la cola. Devuelve true si quedó vacía. */
export async function flush(): Promise<boolean> {
  if (!supabase || !userId || flushing) return useKalma.getState().outbox.length === 0;
  const pending = useKalma.getState().outbox;
  if (pending.length === 0) return true;
  flushing = true;
  try {
    const ops = compact(pending);
    const done = new Set<string>();
    // Una tabla que falla (p. ej., falta correr una migración en Supabase) no detiene a las demás:
    // lo suyo queda en la cola y se reintenta; lo de las otras tablas sí se envía.
    const failed = new Set<SyncTable>();
    const ofTable = (t: SyncTable, kind: SyncOp['kind']) => ops.filter((o) => o.table === t && o.kind === kind);

    // Borrados primero, de hijos a padres (los eventos antes que sus registros)
    for (const t of [...TABLE_ORDER].reverse()) {
      for (const op of ofTable(t, 'delete')) {
        const { error } = await supabase.from(t).delete().match(op.key);
        if (error) { failed.add(t); break; }
        done.add(`${op.table}|${JSON.stringify(op.key)}`);
      }
    }
    // Altas y cambios, de padres a hijos, por lotes
    for (const t of TABLE_ORDER) {
      const ups = ofTable(t, 'upsert');
      if (!ups.length || failed.has(t)) continue;
      const rows = ups.map((o) => ({ ...(o.row as Row), user_id: userId }));
      let ok = true;
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase.from(t).upsert(rows.slice(i, i + 200), { onConflict: ON_CONFLICT[t] });
        if (error) { ok = false; break; }
      }
      if (!ok) { failed.add(t); continue; }
      for (const o of ups) done.add(`${o.table}|${JSON.stringify(o.key)}`);
    }
    // Se quitan de la cola todas las operaciones (incluidas las compactadas) de las filas enviadas
    const ids = pending.filter((o) => done.has(`${o.table}|${JSON.stringify(o.key)}`)).map((o) => o.id);
    useKalma.getState().dequeue(ids);
    if (failed.size) scheduleFlush(15000);
    return useKalma.getState().outbox.length === 0;
  } catch {
    // Sin conexión o error temporal: se reintenta más tarde (la cola se conserva)
    scheduleFlush(15000);
    return false;
  } finally {
    flushing = false;
  }
}

const OPTIONAL_PULL = new Set<string>(['doctors', 'doctor_visits']);

const PULL_TABLES = ['profiles', 'consents', 'conditions', 'medications', 'entries', 'events', 'pattern_flags', 'experiments', 'doctors', 'doctor_visits'] as const;

/** Descarga los datos de la cuenta y reemplaza la caché local (solo si no hay nada pendiente). */
export async function pull(): Promise<boolean> {
  if (!supabase || !userId) return false;
  if (useKalma.getState().outbox.length > 0) return false;
  const results = await Promise.all(PULL_TABLES.map((t) => supabase!.from(t).select('*')));
  // Las tablas de migraciones posteriores (médicos y visitas) pueden no existir todavía en el proyecto:
  // si fallan, se descargan vacías en vez de dejar a la persona sin ninguno de sus datos.
  if (results.some((r, i) => r.error && !OPTIONAL_PULL.has(PULL_TABLES[i]!))) return false;
  const tables = Object.fromEntries(PULL_TABLES.map((t, i) => [t, (results[i]!.error ? [] : (results[i]!.data ?? [])) as Row[]])) as Partial<Tables>;
  applyingRemote = true;
  try {
    useKalma.setState(fromRows(tables));
  } finally {
    applyingRemote = false;
  }
  return true;
}

/** Al iniciar sesión: enviar lo pendiente y luego traer lo de la nube. */
export async function syncOnSignIn(uid: string) {
  startSync(uid);
  await flush();
  await pull();
}

/** Registro de que se generó un reporte (el PDF no se sube). */
export function logReport(rangeDays: number, sections: string[], id: string) {
  const s = useKalma.getState();
  if (!s.workspace.startsWith('user:')) return;
  s.enqueue([{ table: 'reports', kind: 'upsert', key: { id }, row: { id, range_days: rangeDays, sections, created_at: new Date().toISOString() } }]);
  scheduleFlush(300);
}
