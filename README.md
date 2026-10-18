# Kalma

> Cuéntale a Kalma cómo te sientes. Ella encuentra el patrón.

App móvil (Android e iOS) para la materia **Diseño de Interfaces**. Kalma convierte un audio de 10 segundos en datos de salud, busca patrones entre hábitos y síntomas (migraña y molestias digestivas) y arma un reporte de una página para el médico.

**Kalma no diagnostica, no receta y no reemplaza al médico.** Entiende lo que dictas con Google Gemini (a través de una función de Supabase que guarda la llave) y, si no hay conexión o la IA falla, con su propio analizador en el celular. Las cuentas y los datos por usuario usan Supabase.

Stack: Expo SDK 58 · React Native 0.88 · TypeScript strict · Expo Router · Reanimated 4 · Zustand · Supabase · Storybook RN.

## Correr la app

Requiere Node 20 o superior.

```bash
npm install
cp .env.example .env    # y completa los datos de Supabase (ver abajo); sin .env la app funciona solo en modo demo
npx expo start          # escanea el QR con Expo Go (Android) o con la cámara (iOS)
```

**En Expo Go** funciona todo menos la voz real: el reconocimiento de voz es un módulo nativo que Expo Go no incluye. La app lo detecta y ofrece transcripciones de ejemplo y texto libre, sin errores.

> Si la App Store o Google Play todavía no tienen el Expo Go de la SDK 58, usa la versión web (`w` en la terminal de Expo) o un development build.

### Generar el APK (voz real, pruebas de usabilidad y sustentación)

```bash
npm i -g eas-cli        # o usa npx eas-cli@latest
eas login
eas build -p android --profile preview      # APK instalable (perfiles en eas.json)
eas build -p android --profile development  # development build para seguir desarrollando con voz real
```

Para que el APK tenga las cuentas, configura las mismas variables `EXPO_PUBLIC_…` en EAS (`eas env:create`). Paso a paso, perfiles, checklist antes de la prueba y problemas comunes: [docs/build.md](docs/build.md).

## Cuentas con Supabase

### 1. Crear el proyecto
1. Entra a [supabase.com](https://supabase.com) y crea un proyecto (plan gratuito).
2. En **Project Settings › API** copia la **Project URL** y la **anon public key** a tu `.env`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
   La anon key es pública por diseño: la protegen las políticas RLS. **Nunca** pongas la `service_role` key en `.env`, en la app ni en el repositorio.
3. Reinicia Expo (`npx expo start --clear`) para que tome las variables.

### 2. Crear las tablas (migraciones)
Con la [CLI de Supabase](https://supabase.com/docs/guides/cli):
```bash
npx supabase login
npx supabase link --project-ref <tu-ref>      # el ref está en la URL del proyecto
npx supabase db push                          # aplica supabase/migrations/
```
O, sin CLI: abre **SQL Editor** en el panel y ejecuta, **en orden**, el contenido de cada archivo:

1. [20261017000000_kalma_init.sql](supabase/migrations/20261017000000_kalma_init.sql): tablas base, RLS y trigger del perfil.
2. [20261018000000_kalma_fase9.sql](supabase/migrations/20261018000000_kalma_fase9.sql): experimentos con síntoma, médicos y visitas.
3. [20261019000000_kalma_ciclo.sql](supabase/migrations/20261019000000_kalma_ciclo.sql): preferencia «registrar mi ciclo» en el perfil.

Si falta alguna, la app sigue funcionando: lo de esa tabla queda en cola y se sube cuando la migración exista (D79).

La migración crea 11 tablas (perfiles, consentimientos, condiciones, medicamentos, registros, eventos, contexto diario, preferencias de patrones, experimentos, reportes y recordatorios), todas con `user_id → auth.users on delete cascade`, **RLS activado** con políticas de select/insert/update/delete (`user_id = auth.uid()`) y el trigger que crea el perfil al registrarse.

### 3. URL de redirección (confirmar correo y recuperar contraseña)
En **Authentication › URL Configuration**:
- **Site URL:** `kalma://`
- **Redirect URLs:** agrega
  - `kalma://**` (APK y development build)
  - `exp://**` (Expo Go; la dirección exacta cambia según la red, por eso el comodín)

Los enlaces de correo abren la app en `auth/callback` (confirmación) o en `nueva-contrasena` (recuperación). Ábrelos **en el mismo celular** donde los pediste.

### 4. Confirmación de correo: activar o desactivar
En **Authentication › Providers › Email › Confirm email**:
- **Activada** (recomendado en producción): al crear la cuenta aparece "Revisa tu correo" y la persona entra al confirmar.
- **Desactivada** (recomendado para las **pruebas de usabilidad**): la cuenta entra directo al onboarding, sin depender del correo de cada participante. Si la desactivas para una sesión de pruebas, déjalo anotado en el protocolo y vuelve a activarla después.

### 5. Desplegar la función de eliminar cuenta
La app nunca tiene la `service_role` key: eliminar la cuenta lo hace una Edge Function del lado del servidor.
```bash
npx supabase functions deploy delete-account
```
Supabase le entrega automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`. La función verifica quién llama con su propio token y solo borra a esa persona (sus datos se eliminan en cascada).

### 5b. IA real con Google Gemini (opcional)
1. Crea una llave gratuita en https://aistudio.google.com/apikey.
2. Guárdala como secreto (en tu terminal, **nunca** en la app ni en el repositorio):
   ```bash
   npx supabase secrets set GEMINI_API_KEY=tu_llave --project-ref <tu-ref>
   ```
3. Despliega la función: `npx supabase functions deploy ai --project-ref <tu-ref> --use-api --no-verify-jwt`.
4. Opcional: otro modelo con `GEMINI_MODEL` (por defecto `gemini-3.5-flash-lite`).

Sin la llave, la app funciona igual con su analizador local.

### 6. Verificar que dos cuentas no se ven entre sí
Con la confirmación de correo **desactivada**:
```bash
node --env-file=.env scripts/test-rls.mjs
```
Crea dos usuarios de prueba y comprueba que B no puede leer, modificar, borrar ni escribir a nombre de A, que sin sesión no se ve nada y que el trigger crea el perfil. Al final borra las cuentas de prueba (si la función `delete-account` está desplegada).

### Cómo se separan los datos
- **Demo** (`Explorar con datos de ejemplo`): los 45 días de Laura, solo en el celular, en un espacio propio. Nunca se envían a Supabase.
- **Cuenta real**: empieza vacía. Caché local por usuario (funciona sin conexión) + cola de cambios que se envía cuando hay internet. Cerrar sesión borra la caché local de esa cuenta; eliminar la cuenta borra todo en Supabase.

## Datos de la demo

**Laura**: 45 días sintéticos (42 con registros) con dos patrones planteados (dormir < 6 h → dolor de cabeza 6–24 h después; lácteos → molestia digestiva 0–6 h después), ruido independiente y un experimento terminado. En Perfil › Demo puedes reiniciarla. El detalle está en [src/mocks/seed.ts](src/mocks/seed.ts).

## Design system

- **Tokens:** [src/theme/tokens.ts](src/theme/tokens.ts) (claro y oscuro), [src/theme/typography.ts](src/theme/typography.ts).
- **Componentes:** [src/components/ui/](src/components/ui/) (incluye TextField, PasswordField, PasswordRequirements y Checkbox).
- **Catálogo en la app:** Perfil › *Ver el design system*. Funciona en Expo Go e incluye la tabla de contraste en vivo.
- **Storybook RN:** `npm run storybook:app`; luego abre la ruta `/storybook` en la app. Solo entra al bundle en ese modo.

## Calidad

```bash
npm test            # contraste WCAG, accesibilidad, semilla, IA simulada, patrones, reporte, cuentas, espacios y sincronización
npm run typecheck
npm run lint
npm run doctor      # expo-doctor
node scripts/check-reflow.mjs   # reflujo a 320 px (con la app corriendo; ver docs/accesibilidad.md)
```

## Documentación de diseño

- [docs/decisiones-de-diseno.md](docs/decisiones-de-diseno.md): cada decisión con su principio, la alternativa descartada y cómo se valida.
- [docs/accesibilidad.md](docs/accesibilidad.md): checklist WCAG 2.1 AA aplicado a móvil, tabla de contraste y reflujo a 320 px.
- [docs/heuristicas.md](docs/heuristicas.md): autoevaluación con las 10 heurísticas de Nielsen y severidad.
- [docs/prueba-usabilidad.md](docs/prueba-usabilidad.md): guion de la prueba con 5 personas, tareas T0–T11, SUS y formato de hallazgos.
- [docs/build.md](docs/build.md): generar el APK con EAS.

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Proyecto Expo, tokens, fuentes, tema claro/oscuro, componentes, Storybook, pestañas | ✅ |
| 2 | Datos semilla (45 días) y store con persistencia | ✅ |
| 3 | Registro por voz completo + permisos + pantalla de emergencia | ✅ |
| 4 | Hoy y Calendario | ✅ |
| 5 | Check-in nocturno con notificación local | ✅ |
| 6 | Motor de patrones y pantallas de Patrones | ✅ |
| 7 | Reporte para el médico, PDF y compartir | ✅ |
| — | Cuentas reales (Supabase): bienvenida, crear cuenta, iniciar sesión, recuperación, RLS, sincronización, eliminar cuenta | ✅ |
| 8 | Onboarding con consentimiento | ✅ |
| 9 | Experimentos, Volví del médico, Ajustes completos, cuidador, biometría | ✅ |
| 10 | Pulido (errores, 404, háptica), auditoría de accesibilidad, heurísticas, guion de prueba, build con EAS | ✅ |
| 11 | Mensaje del día, ciclo menstrual opcional, comidas y consejos, modo crisis, resumen semanal, aviso de analgésicos, ayuda | ✅ |
| 12 | IA real con Google Gemini (Edge Function `ai`) y respaldo local | ✅ |

**Mejora futura:** inicio de sesión con Google (y Apple en iOS).
