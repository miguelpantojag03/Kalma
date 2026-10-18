// Edge Function: eliminar la cuenta de la persona que la llama, y con ella todos sus datos.
//
// - La app NUNCA tiene la service_role key: esta función corre en Supabase y la lee del entorno
//   (SUPABASE_SERVICE_ROLE_KEY la inyecta Supabase automáticamente a las Edge Functions).
// - Primero se verifica quién llama con su propio token (JWT de sesión); solo se puede borrar a sí misma.
// - Borrar el usuario de Auth elimina todas sus filas por "on delete cascade".
//
// Despliegue: panel › Edge Functions › Deploy a new function › Via Editor (nombre: delete-account)
//             o con la CLI: supabase functions deploy delete-account
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'unauthorized' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ¿Quién llama? (se valida su token de sesión)
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return json(401, { error: 'unauthorized' });

  // Se borra SOLO a esa persona; sus datos se van por cascade
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json(500, { error: 'delete_failed' });

  return json(200, { deleted: true });
});
