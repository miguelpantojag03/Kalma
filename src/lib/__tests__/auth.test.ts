import { authErrorKind, friendlyAuthError } from '@/lib/authErrors';
import { emailError, isValidEmail, isValidPassword, passwordRules } from '@/lib/validation';

describe('validación de cuenta', () => {
  it.each(['laura@gmail.com', 'a.b+c@uni.edu.co', '  laura@kalma.app '])('correo válido: %s', (e) => expect(isValidEmail(e)).toBe(true));
  it.each(['laura', 'laura@', 'laura@gmail', 'laura gmail.com', '@gmail.com'])('correo inválido: %s', (e) => expect(isValidEmail(e)).toBe(false));

  it('requisitos de contraseña: 8 caracteres, una letra, un número', () => {
    expect(passwordRules('abc').map((r) => r.ok)).toEqual([false, true, false]);
    expect(passwordRules('12345678').map((r) => r.ok)).toEqual([true, false, true]);
    expect(isValidPassword('tintico2026')).toBe(true);
    expect(isValidPassword('ñandú2026')).toBe(true); // letras con tilde y ñ cuentan
    expect(isValidPassword('abcdefgh')).toBe(false);
  });

  it('mensajes de error en español, sin tecnicismos', () => {
    expect(emailError('')).toBe('Escribe tu correo.');
    expect(emailError('laura@')).toMatch(/Revisa el correo/);
    expect(emailError('laura@gmail.com')).toBeUndefined();
  });
});

describe('errores de Supabase traducidos', () => {
  it.each([
    [{ code: 'user_already_exists', message: 'User already registered' }, 'email-taken'],
    [{ code: 'weak_password', message: 'Password should be at least 8 characters' }, 'weak-password'],
    [{ code: 'over_request_rate_limit', status: 429 }, 'rate-limit'],
    [{ code: 'over_email_send_rate_limit', status: 429 }, 'rate-limit'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Network request failed' }, 'offline'],
    [new TypeError('Network request failed'), 'offline'],
    [{ code: 'invalid_credentials', message: 'Invalid login credentials' }, 'invalid-credentials'],
    [{ code: 'email_not_confirmed' }, 'email-not-confirmed'],
    [{ code: 'otp_expired' }, 'session-expired'],
    [{ message: 'algo raro del servidor 500' }, 'unknown'],
  ])('%j → %s', (err, kind) => expect(authErrorKind(err)).toBe(kind));

  it('el error de credenciales no revela si el correo existe', () => {
    expect(friendlyAuthError({ code: 'invalid_credentials' }).message).toBe('El correo o la contraseña no coinciden.');
  });

  it('nunca devuelve el mensaje técnico', () => {
    const technical = 'AuthApiError: duplicate key value violates unique constraint "users_email_partial_key"';
    expect(friendlyAuthError({ message: technical }).message).not.toContain('duplicate');
  });
});
