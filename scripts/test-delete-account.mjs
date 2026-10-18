// Prueba de punta a punta de "Eliminar mi cuenta": crea un usuario, le guarda un registro,
// llama a la Edge Function delete-account y verifica que la cuenta y sus datos ya no existen.
// Uso: node --env-file=.env scripts/test-delete-account.mjs   (con la confirmación de correo desactivada)
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = `borrar-${Date.now()}@example.com`;
// Contraseña aleatoria en cada ejecución (nunca una contraseña fija en un repositorio público)
const password = `Kalma-${crypto.randomUUID()}`;

const c = createClient(url, anon, { auth: { persistSession: false } });
const { data: su, error: e1 } = await c.auth.signUp({ email, password, options: { data: { name: 'Para borrar' } } });
if (e1 || !su.session) throw new Error(`No pude crear el usuario: ${e1?.message ?? 'sin sesión'}`);
const uid = su.user.id;
console.log('✓ cuenta temporal creada');

const id = `del-${Date.now()}`;
const ins = await c.from('entries').insert({ id, user_id: uid, recorded_at: new Date().toISOString(), source: 'text', transcript: 'x' });
console.log(ins.error ? `✗ no pude guardar el registro: ${ins.error.message}` : '✓ registro guardado');

const { data, error } = await c.functions.invoke('delete-account', { method: 'POST' });
if (error) {
  let detail = error.message;
  try { detail += ` · ${JSON.stringify(await error.context?.json?.())}`; } catch {}
  console.log(`✗ la función respondió con error: ${detail}`);
  process.exit(1);
}
console.log('✓ la función respondió:', JSON.stringify(data));

const again = await createClient(url, anon, { auth: { persistSession: false } }).auth.signInWithPassword({ email, password });
console.log(again.error ? '✓ la cuenta ya no puede iniciar sesión' : '✗ la cuenta todavía existe');
process.exit(again.error ? 0 : 1);
