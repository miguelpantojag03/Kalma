/**
 * Validación de los formularios de cuenta. Se muestra al SALIR de cada campo (no mientras se escribe):
 * nadie quiere un error rojo cuando apenas va en la segunda letra (D52).
 */

/** Suficiente para detectar errores de tipeo; la verificación real la hace el correo de confirmación. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export interface PasswordRule {
  id: 'length' | 'letter' | 'number';
  label: string;
  ok: boolean;
}

/** Requisitos visibles como lista que se va marcando (reconocer antes que recordar, Nielsen #6). */
export function passwordRules(pw: string): PasswordRule[] {
  return [
    { id: 'length', label: 'Mínimo 8 caracteres', ok: pw.length >= 8 },
    { id: 'letter', label: 'Al menos una letra', ok: /\p{L}/u.test(pw) },
    { id: 'number', label: 'Al menos un número', ok: /\d/.test(pw) },
  ];
}

export const isValidPassword = (pw: string) => passwordRules(pw).every((r) => r.ok);

export const isValidName = (name: string) => name.trim().length >= 2;

export function emailError(email: string): string | undefined {
  if (!email.trim()) return 'Escribe tu correo.';
  if (!isValidEmail(email)) return 'Revisa el correo: parece que le falta algo (por ejemplo, la @ o el .com).';
  return undefined;
}

export function nameError(name: string): string | undefined {
  return isValidName(name) ? undefined : 'Escribe cómo quieres que te llame (mínimo 2 letras).';
}

export function passwordError(pw: string): string | undefined {
  if (!pw) return 'Escribe una contraseña.';
  return isValidPassword(pw) ? undefined : 'Tu contraseña aún no cumple los requisitos de abajo.';
}
