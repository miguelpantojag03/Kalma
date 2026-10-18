// Prueba de aislamiento entre cuentas (RLS) contra tu proyecto de Supabase.
//
// Uso:  node --env-file=.env scripts/test-rls.mjs
// Requisito: confirmación de correo DESACTIVADA (Auth › Providers › Email › Confirm email = off),
// porque crea dos usuarios de prueba y necesita sesión inmediata. Usa SOLO la anon key.
// Al final, borra los datos de prueba (y las cuentas, si desplegaste la Edge Function delete-account).
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env');
  process.exit(1);
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function newUser(tag) {
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const email = `rls-${tag}-${Date.now()}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: 'pruebaRLS2026', options: { data: { name: `Prueba ${tag}` } } });
  if (error || !data.session) throw new Error(`No pude crear el usuario ${tag}: ${error?.message ?? 'sin sesión (¿confirmación de correo activa?)'}`);
  return { client, id: data.user.id };
}

const A = await newUser('a');
const B = await newUser('b');

// El trigger creó el perfil con el nombre
const { data: profA } = await A.client.from('profiles').select('name').single();
check('el trigger crea el perfil al registrarse', profA?.name === 'Prueba a');

// A crea un registro y un evento
const entryId = `rls-${Date.now()}`;
const insA = await A.client.from('entries').insert({ id: entryId, user_id: A.id, recorded_at: new Date().toISOString(), source: 'text', transcript: 'privado de A' });
check('A puede crear su registro', !insA.error, insA.error?.message);
const evA = await A.client.from('events').insert({ id: `${entryId}-0`, user_id: A.id, entry_id: entryId, type: 'note', occurred_at_precision: 'exact', confidence: 1, data: { text: 'privado' } });
check('A puede crear su evento', !evA.error, evA.error?.message);

// B no ve nada de A
const seeB = await B.client.from('entries').select('*').eq('id', entryId);
check('B NO puede leer el registro de A', (seeB.data ?? []).length === 0);
const seeProfiles = await B.client.from('profiles').select('*');
check('B solo ve su propio perfil', (seeProfiles.data ?? []).every((p) => p.user_id === B.id));

// B no puede modificar ni borrar lo de A
const updB = await B.client.from('entries').update({ transcript: 'hackeado' }).eq('id', entryId).select();
check('B NO puede modificar el registro de A', (updB.data ?? []).length === 0);
const delB = await B.client.from('entries').delete().eq('id', entryId).select();
check('B NO puede borrar el registro de A', (delB.data ?? []).length === 0);

// B no puede escribir a nombre de A
const spoof = await B.client.from('entries').insert({ id: `spoof-${Date.now()}`, user_id: A.id, recorded_at: new Date().toISOString(), source: 'text' });
check('B NO puede crear filas a nombre de A', !!spoof.error);

// B no puede colgar un evento del registro de A
const cross = await B.client.from('events').insert({ id: `cross-${Date.now()}`, user_id: B.id, entry_id: entryId, type: 'note', occurred_at_precision: 'exact', confidence: 1, data: {} });
check('B NO puede agregar eventos al registro de A', !!cross.error);

// Sin sesión no se ve nada
const anonClient = createClient(url, anon, { auth: { persistSession: false } });
const seeAnon = await anonClient.from('entries').select('*');
check('sin sesión no se ve ningún registro', (seeAnon.data ?? []).length === 0);

// El registro de A sigue intacto
const still = await A.client.from('entries').select('transcript').eq('id', entryId).single();
check('el registro de A sigue intacto', still.data?.transcript === 'privado de A');

// Limpieza
await A.client.from('entries').delete().eq('id', entryId);
for (const u of [A, B]) {
  const { error } = await u.client.functions.invoke('delete-account', { method: 'POST' });
  if (error) console.log(`(No pude borrar la cuenta de prueba ${u.id}: despliega la Edge Function delete-account o bórrala en Auth › Users)`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} de ${results.length} comprobaciones pasaron.`);
process.exit(failed ? 1 : 0);
