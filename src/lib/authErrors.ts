/**
 * Traduce los errores de Supabase Auth a español claro. NUNCA se muestra el mensaje técnico.
 * Cada mensaje dice qué pasó y qué puede hacer la persona (Nielsen #9).
 */
export type AuthErrorKind =
  | 'email-taken'
  | 'weak-password'
  | 'rate-limit'
  | 'offline'
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'same-password'
  | 'invalid-email'
  | 'signup-disabled'
  | 'session-expired'
  | 'not-configured'
  | 'unknown';

export interface FriendlyAuthError {
  kind: AuthErrorKind;
  message: string;
}

const MESSAGES: Record<AuthErrorKind, string> = {
  'email-taken': 'Ya hay una cuenta con este correo. ¿Quieres iniciar sesión?',
  'weak-password': 'Esa contraseña es muy fácil de adivinar. Prueba con una más larga, con letras y números.',
  'rate-limit': 'Espera un momento e inténtalo de nuevo.',
  offline: 'Necesitas internet para crear tu cuenta o iniciar sesión.',
  // Genérico a propósito: no revela si el correo existe (D53)
  'invalid-credentials': 'El correo o la contraseña no coinciden.',
  'email-not-confirmed': 'Aún no confirmas tu correo. Te podemos enviar el enlace otra vez.',
  'same-password': 'La nueva contraseña debe ser distinta a la anterior.',
  'invalid-email': 'Revisa el correo: parece que le falta algo.',
  'signup-disabled': 'Por ahora no se pueden crear cuentas nuevas. Puedes explorar con datos de ejemplo.',
  'session-expired': 'Tu enlace ya venció. Pide uno nuevo.',
  'not-configured': 'Las cuentas aún no están configuradas en este prototipo. Puedes explorar con datos de ejemplo.',
  unknown: 'Algo no salió bien. Inténtalo de nuevo en un momento.',
};

interface MaybeAuthError {
  code?: string;
  status?: number;
  name?: string;
  message?: string;
}

export function authErrorKind(error: unknown): AuthErrorKind {
  const e = (error ?? {}) as MaybeAuthError;
  const code = e.code ?? '';
  const msg = (e.message ?? '').toLowerCase();

  // Sin conexión: fetch falla antes de llegar al servidor
  if (e.name === 'AuthRetryableFetchError' || e.status === 0 || /network request failed|failed to fetch|fetch failed|network error/.test(msg)) return 'offline';
  if (code === 'user_already_exists' || code === 'email_exists' || /already registered|already exists/.test(msg)) return 'email-taken';
  if (code === 'weak_password' || /weak password|password should/.test(msg)) return 'weak-password';
  if (code.startsWith('over_') || e.status === 429 || /rate limit|too many/.test(msg)) return 'rate-limit';
  if (code === 'invalid_credentials' || /invalid login credentials/.test(msg)) return 'invalid-credentials';
  if (code === 'email_not_confirmed' || /email not confirmed/.test(msg)) return 'email-not-confirmed';
  if (code === 'same_password') return 'same-password';
  if (code === 'email_address_invalid' || code === 'validation_failed' || /invalid email|unable to validate email/.test(msg)) return 'invalid-email';
  if (code === 'signup_disabled' || code === 'email_provider_disabled') return 'signup-disabled';
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'bad_code_verifier' || /expired/.test(msg)) return 'session-expired';
  if (code === 'not_configured') return 'not-configured';
  return 'unknown';
}

export function friendlyAuthError(error: unknown): FriendlyAuthError {
  const kind = authErrorKind(error);
  return { kind, message: MESSAGES[kind] };
}

export const authMessage = (kind: AuthErrorKind) => MESSAGES[kind];
