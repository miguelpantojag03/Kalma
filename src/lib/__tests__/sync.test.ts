import { openWorkspace, useKalma } from '@/lib/store';
import { compact, startSync, stopSync } from '@/lib/sync/engine';
import { diffTables, fromRows, toRows } from '@/lib/sync/mapping';
import type { SyncOp } from '@/lib/store';
import { generateSeed } from '@/mocks/seed';

jest.mock('@/lib/supabase', () => ({ supabase: null, supabaseConfigured: false }));

const UID = '11111111-1111-4111-8111-111111111111';
const now = new Date('2026-10-17T23:00:00');
const seed = generateSeed({ now });
const data = { ...seed, dismissedPatterns: ['p1'], reportPatterns: ['p2'], seenPatterns: ['p1', 'p3'] };

describe('mapeo store ↔ tablas', () => {
  it('ida y vuelta conserva los datos', () => {
    const rows = toRows(data, UID);
    const back = fromRows(rows);
    expect(back.entries).toEqual(seed.entries);
    expect(back.experiments).toEqual(seed.experiments);
    expect(back.profile.name).toBe('Laura');
    expect(back.profile.conditions).toEqual(seed.profile.conditions);
    expect(back.consent.health).toBe(true);
    expect(back.dismissedPatterns).toEqual(['p1']);
    expect(back.reportPatterns).toEqual(['p2']);
    expect(back.seenPatterns.sort()).toEqual(['p1', 'p3']);
  });

  it('todas las filas llevan el user_id de la cuenta', () => {
    const rows = toRows(data, UID);
    for (const list of Object.values(rows)) for (const r of list) expect(r.user_id).toBe(UID);
  });

  it('el check-in se resume en daily_context', () => {
    const rows = toRows(data, UID);
    expect(rows.daily_context.length).toBeGreaterThan(20);
    expect(rows.daily_context.every((r) => r.checkin_done === true)).toBe(true);
  });
});

describe('diff → operaciones', () => {
  const base = toRows(data, UID);

  it('sin cambios no genera operaciones', () => {
    expect(diffTables(base, toRows(data, UID))).toEqual([]);
  });

  it('un registro nuevo genera el upsert del registro y de sus eventos', () => {
    const entry = { ...seed.entries[0]!, id: 'nuevo', events: seed.entries[0]!.events.map((e, i) => ({ ...e, id: `nuevo-${i}`, entryId: 'nuevo' })) };
    const ops = diffTables(base, toRows({ ...data, entries: [...data.entries, entry] }, UID));
    expect(ops.filter((o) => o.table === 'entries')).toHaveLength(1);
    expect(ops.filter((o) => o.table === 'events')).toHaveLength(entry.events.length);
    expect(ops.every((o) => o.kind === 'upsert')).toBe(true);
  });

  it('borrar un registro genera los deletes', () => {
    const ops = diffTables(base, toRows({ ...data, entries: data.entries.slice(1) }, UID));
    expect(ops.some((o) => o.table === 'entries' && o.kind === 'delete' && o.key.id === seed.entries[0]!.id)).toBe(true);
  });

  it('cambiar el nombre solo actualiza el perfil', () => {
    const ops = diffTables(base, toRows({ ...data, profile: { ...data.profile, name: 'Lau' } }, UID));
    expect(ops.map((o) => o.table)).toEqual(['profiles']);
  });
});

describe('la demo nunca toca Supabase', () => {
  it('aunque el motor esté activo, los cambios en la demo no generan operaciones', async () => {
    await openWorkspace('demo');
    startSync(UID); // simulación de un error: motor activo para otra cuenta
    useKalma.getState().addEntry({
      transcript: 'demo', summary: 'd', source: 'voice',
      events: [{ type: 'note', occurred_at: null, occurred_at_precision: 'unknown', confidence: 1, source_text: 'x', data: { text: 'x' } }],
    });
    expect(useKalma.getState().outbox).toHaveLength(0);
    stopSync();
  });

  it('en una cuenta real, un registro nuevo sí entra a la cola', async () => {
    await openWorkspace(`user:${UID}`);
    startSync(UID);
    useKalma.getState().addEntry({
      transcript: 'real', summary: 'r', source: 'voice',
      events: [{ type: 'note', occurred_at: null, occurred_at_precision: 'unknown', confidence: 1, source_text: 'x', data: { text: 'x' } }],
    });
    const tables = useKalma.getState().outbox.map((o) => o.table);
    expect(tables).toEqual(expect.arrayContaining(['entries', 'events']));
    stopSync();
  });
});

describe('cola de sincronización', () => {
  it('compacta: por cada fila queda la última operación', () => {
    const op = (id: string, kind: SyncOp['kind'], key: string): SyncOp => ({ id, table: 'entries', kind, key: { id: key }, at: '' });
    const out = compact([op('1', 'upsert', 'a'), op('2', 'upsert', 'b'), op('3', 'delete', 'a')]);
    expect(out.map((o) => o.id).sort()).toEqual(['2', '3']);
    expect(out.find((o) => o.key.id === 'a')!.kind).toBe('delete');
  });
});
