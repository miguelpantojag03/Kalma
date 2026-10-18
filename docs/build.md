# Build con EAS — APK para pruebas y sustentación

Expo Go sirve para revisar pantallas, pero **no trae el reconocimiento de voz** (es un módulo nativo) ni la huella. Para la prueba de usabilidad y la sustentación se usa un APK propio generado con EAS Build.

## 1. Preparación (una vez)

```bash
npm i -g eas-cli          # o npx eas-cli@latest en cada comando
eas login                 # cuenta gratuita de expo.dev
eas init                  # vincula el proyecto y agrega extra.eas.projectId a app.json
```

## 2. Variables de entorno

El archivo `.env` **no se sube** al repositorio ni a EAS. El APK necesita las mismas dos variables públicas:

| Variable | Qué es | ¿Secreta? |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase | No |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Llave *publishable* (anon) | No: es pública por diseño; la seguridad la dan las políticas RLS |

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://<proyecto>.supabase.co --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value sb_publishable_... --environment preview --visibility plaintext
```

Repite con `--environment development` si vas a usar el development build.

> **Nunca** pongas la `service_role` / *secret key* en EAS, en `.env` ni en el código. Solo la usa la Edge Function `delete-account`, que corre en Supabase y la recibe de su propio entorno.

Sin estas variables, el APK abre solo en modo demo (los botones de cuenta se muestran desactivados), así que la demo nunca falla en la sustentación.

## 3. Perfiles (`eas.json`)

| Perfil | Para qué | Resultado |
|---|---|---|
| `preview` | Prueba de usabilidad y sustentación | APK instalable, sin servidor de desarrollo |
| `development` | Seguir desarrollando con voz y huella reales | APK de *development build* que se conecta a `npx expo start` |
| `production` | (No se usa en el proyecto) | AAB para Play Store |

```bash
eas build -p android --profile preview
```

Al terminar (≈ 10–15 min en la cola gratuita), EAS muestra un enlace y un QR para descargar el APK. En el celular: permitir "instalar apps de origen desconocido" para el navegador.

## 4. Antes de la prueba con participantes

1. Instalar el APK y abrir **Explorar con datos de ejemplo** para confirmar que la demo carga.
2. Permitir micrófono y notificaciones una vez (o dejarlos sin aceptar si la tarea T2b lo necesita).
3. Perfil › Demo › *Reiniciar la demo* entre participantes.
4. Activar la grabación de pantalla del celular (con consentimiento del participante).
5. Revisar que el volumen de vibración esté activo (háptica, D68).

## 5. iOS

EAS puede generar un build de iOS, pero requiere una cuenta de Apple Developer (pago). Para el proyecto, iOS se muestra con Expo Go o en la versión web dentro del marco de celular.

## 6. Problemas comunes

| Síntoma | Solución |
|---|---|
| "Project incompatible with this version of Expo Go" | La tienda aún no tiene el Expo Go de la SDK 58. Usa el APK de `development` o la web (`w`). |
| El APK abre en modo demo aunque hay cuentas | Faltan las variables en el entorno de EAS correcto (`preview`). |
| El enlace del correo de confirmación no abre la app | Agrega `kalma://auth/callback` a *Redirect URLs* en Supabase (ver README, paso 3). |
| "Eliminar mi cuenta" muestra un error amable | Falta desplegar la Edge Function `delete-account` (README, paso 5). |
