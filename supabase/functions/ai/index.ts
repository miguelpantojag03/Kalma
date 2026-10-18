// Edge Function "ai": interpreta lo que la persona dijo con Google Gemini.
//
// - La llave de Gemini NUNCA está en la app: vive como secreto de Supabase (GEMINI_API_KEY).
//   Se guarda con: npx supabase secrets set GEMINI_API_KEY=... --project-ref <ref>
// - Recibe SOLO el texto dictado (o la foto que la persona eligió) y la hora local, sin nombre.
// - No guarda ni registra el texto. La app valida la respuesta y, si algo falla, usa su analizador local.
// - Las banderas rojas NO dependen de esta función: la app las detecta antes, sin internet.
// - Abierta sin sesión (para la demo), con límites: texto ≤ 1.500 caracteres y 20 pedidos por minuto por IP.
//
// Despliegue: npx supabase functions deploy ai --project-ref <ref> --use-api --no-verify-jwt

// Flash-Lite: responde en 1–2 s y su cuota gratuita alcanza para la demo (Flash tardaba 12–15 s y se agotaba)
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite';
const API_KEY = Deno.env.get('GEMINI_API_KEY');
const MAX_TEXT = 1500;
/** Foto en base64 (≈ 4,5 MB de imagen): suficiente para una foto comprimida del celular. */
const MAX_IMAGE = 6_000_000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Límite simple por IP (por instancia): suficiente para que nadie agote la cuota gratuita con un script.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

const ENTRY_PROMPT = `Eres el componente que convierte lo que una persona en Colombia le cuenta a una app de diario de salud (migraña y molestias digestivas) en datos estructurados. NO diagnosticas, NO das consejos, NO opinas: solo extraes lo que la persona dijo, sin inventar nada.

Responde SOLO con un objeto JSON con esta forma:
{"summary": string, "events": Event[], "unparsed": string | null}

Cada Event tiene: {"type", "occurred_at", "occurred_at_precision", "confidence", "source_text", "data"}
- "occurred_at": fecha y hora ISO 8601 CON el mismo desfase horario de AHORA (p. ej. "2026-10-18T13:00:00-05:00"), o null si no se puede ubicar.
- "occurred_at_precision": "exact" (dijo la hora), "approximate" ("como a las 3", "hace un rato"), "part_of_day" ("en la mañana" → 08:00, "al mediodía" → 12:30, "en la tarde" → 15:00, "en la noche" → 20:00) o "unknown" (no dijo cuándo: usa AHORA).
- "confidence": 0 a 1 (qué tan seguro estás de haber entendido ese evento).
- "source_text": el fragmento EXACTO del texto original de donde sale el evento.

Tipos y su "data" (usa exactamente estos nombres de campo):
- "symptom": {"name", "body_location", "side", "intensity_0_10", "intensity_inferred", "character", "duration_minutes"}
  name en minúsculas; usa "dolor de cabeza" (también para migraña/jaqueca), "molestia digestiva" (dolor de estómago, barriga, retorcijón, cólico, inflamación, gases, llenura), "acidez", "náuseas", "diarrea", "mareo", "cansancio" u otro nombre corto.
  side: "left" | "right" | "both" | "center" | null. intensity_0_10: número dicho, o inferido de palabras ("un poquito/leve" 3, "molesto/regular/maluco" 5, "fuerte/duro/tenaz" 7, "muy fuerte" 8, "el peor/insoportable" 9) con intensity_inferred true; null si no dijo nada de intensidad.
- "food" o "drink": {"name", "canonical_name", "categories", "meal", "quantity"}
  name como lo dijo, con mayúscula inicial ("Bandeja paisa"); canonical_name en minúsculas.
  categories: SOLO de esta lista: "lácteo", "cafeína", "frito", "grasa", "alcohol", "azúcar", "harina", "cacao", "verdura", "fruta", "huevo", "maíz", "carne", "sopa", "picante", "comida casera". Ejemplos colombianos: tinto = café (cafeína), perico/huevos pericos (huevo), almojábana/pandebono/buñuelo (lácteo, harina), arepa (maíz), bandeja paisa (frito, carne, grasa), changua (lácteo, huevo, sopa), gaseosa (azúcar, cafeína si es cola), aguardiente/cerveza (alcohol).
  meal: "breakfast" | "lunch" | "dinner" | "snack" | null ("onces" = snack, "comida" en la noche = dinner). quantity: texto corto o null.
- "medication": {"name", "generic_name", "dose", "taken_for", "relief"}  ("dolex" → name "Acetaminofén (Dolex)", generic_name "acetaminofén"). relief: "full" | "partial" | "none" | "unknown" | null (null si no dijo si le sirvió).
- "sleep": {"hours", "quality_1_5"}
- "stress" o "mood": {"level_0_10"}
- "activity": {"name", "duration_minutes", "intensity"}  intensity: "light" | "moderate" | "vigorous" | null
- "water": {"glasses"}
- "bowel": {"description", "bristol"}
- "menstrual": {"flow"}  flow: "spotting" | "light" | "medium" | "heavy" | null
- "note": {"text"}  solo si dijo algo de salud que no encaja en los tipos anteriores.

Reglas:
- Un evento por cada cosa distinta (dos alimentos = dos eventos).
- Horas de las comidas cuando no se dice la hora: desayuno 07:30, almuerzo 12:30, onces 16:00, comida/cena 19:30 (precision "part_of_day"). Nunca pongas una comida pasada en la hora AHORA.
- Si algo pasó justo después de otra cosa ("me dio dolor y me tomé una pastilla"), usa la misma hora de lo anterior.
- El sueño ("anoche dormí…") va a las 06:30 del día de AHORA (al despertar).
- Alivio de un medicamento: "me quitó el dolor / me sirvió" → "full"; "me sirvió un poco / poquito / algo" → "partial"; "no me hizo nada / no me sirvió" → "none"; si no lo dice → null.
- "Cólicos" con periodo o regla → symptom "cólico menstrual" (no "molestia digestiva").
- No inventes valores que la persona no dijo (flujo, dosis, cantidad, intensidad, duración): usa null.
- Si algo no tiene que ver con salud, comida, sueño, ánimo o hábitos, no lo conviertas en evento: ponlo en "unparsed".
- "summary": una frase corta en español con lo que entendiste. Si no hay eventos: "No encontré síntomas, comidas ni hábitos en lo que dijiste."
- Nunca agregues interpretación médica ni causas.`;

const PHOTO_PROMPT = `${ENTRY_PROMPT}

Ahora no recibes texto sino una FOTO que la persona tomó para registrar: un plato de comida, una bebida o la caja o empaque de un medicamento.
- Registra solo lo que se ve con claridad; si dudas, baja "confidence" (nunca más de 0.8: es una foto).
- Comida o bebida: un evento por cada alimento reconocible, con sus categorías. "occurred_at" = AHORA con precision "approximate" y "meal" según la hora.
- Medicamento: lee el nombre del empaque; dose solo si está impresa; taken_for y relief en null.
- "source_text": "foto".
- Si la foto no muestra comida, bebida ni medicamento: "events": [] y en "unparsed" una descripción corta de lo que se ve.`;

const VISIT_PROMPT = `Eres el componente que ordena lo que una persona en Colombia cuenta al salir de su cita médica. NO interpretas, NO corriges al médico, NO agregas información: solo organizas lo que la persona dijo.

Responde SOLO con un objeto JSON:
{"diagnoses": string[], "medications": [{"name": string, "dose": string | null, "frequency": string | null}], "instructions": string[], "followUps": [{"label": string, "date": "yyyy-MM-dd" | null}]}

- diagnoses: lo que el médico mencionó como posible causa o diagnóstico, en minúsculas y breve ("migraña sin aura").
- medications: nombre con mayúscula inicial; dose ("50 mg") y frequency ("cada 8 horas", "si me duele") tal como se dijeron, o null.
- instructions: indicaciones en frases cortas, con mayúscula inicial ("Dormir mínimo 7 horas").
- followUps: controles, exámenes o citas. date calculada desde HOY si se puede ("en 15 días", "el 3 de noviembre"); si no, null.
- Si algo no está, devuelve la lista vacía.`;

function extractText(resp: unknown): string {
  // deno-lint-ignore no-explicit-any
  const parts = (resp as any)?.candidates?.[0]?.content?.parts ?? [];
  // deno-lint-ignore no-explicit-any
  return parts.map((p: any) => p?.text ?? '').join('').trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!API_KEY) return json(503, { error: 'not_configured' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (limited(ip)) return json(429, { error: 'rate_limited' });

  let body: { task?: string; text?: string; now?: string; image?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const { task, text, now, image, mimeType } = body;
  const okText = typeof text === 'string' && !!text.trim() && text.length <= MAX_TEXT;
  const okImage = typeof image === 'string' && image.length > 0 && image.length <= MAX_IMAGE && IMAGE_TYPES.includes(mimeType ?? '');
  const valid = typeof now === 'string' && (task === 'entry' || task === 'visit' ? okText : task === 'photo' ? okImage : false);
  if (!valid) return json(400, { error: 'bad_request' });

  const prompt = task === 'entry' ? ENTRY_PROMPT : task === 'visit' ? VISIT_PROMPT : PHOTO_PROMPT;
  const parts = task === 'photo'
    ? [{ text: `AHORA (hora local de la persona): ${now}` }, { inlineData: { mimeType, data: image } }]
    : [{ text: `AHORA (hora local de la persona): ${now}\n\nTexto:\n${text}` }];

  const generationConfig: Record<string, unknown> = { responseMimeType: 'application/json', temperature: 0.2 };
  // Es extracción, no razonamiento: con el mínimo de "pensamiento" responde varias veces más rápido
  if (MODEL.startsWith('gemini-2.5-flash')) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  else if (MODEL.startsWith('gemini-3')) generationConfig.thinkingConfig = { thinkingLevel: 'minimal' };

  const call = (config: Record<string, unknown>) =>
    fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt }] },
        contents: [{ role: 'user', parts }],
        generationConfig: config,
      }),
    }).catch(() => null);

  let res = await call(generationConfig);
  // Si el modelo no acepta la configuración de "pensamiento", se reintenta sin ella
  if (res?.status === 400 && generationConfig.thinkingConfig) {
    const { thinkingConfig: _skip, ...rest } = generationConfig;
    res = await call(rest);
  }

  if (!res) return json(502, { error: 'upstream_unreachable' });
  if (res.status === 429) return json(429, { error: 'quota' });
  if (!res.ok) return json(502, { error: 'upstream_error', status: res.status });

  try {
    const result = JSON.parse(extractText(await res.json()));
    return json(200, { result, model: MODEL });
  } catch {
    return json(502, { error: 'bad_model_output' });
  }
});
