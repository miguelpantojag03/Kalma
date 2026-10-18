/**
 * Autenticación y redirecciones centralizadas.
 *
 * Estados: 'loading' (se mantiene la splash) · 'signedOut' (grupo (auth)) · 'demo' (datos de ejemplo,
 * solo en el dispositivo) · 'signedIn' (cuenta real; (onboarding) si no lo terminó, si no (tabs)).
 *
 * Reglas: sin sesión no se llega a la app; con sesión no se vuelve a (auth) — salvo "Nueva contraseña"
 * durante la recuperación. La sesión guardada funciona sin conexión (se lee del almacenamiento seguro).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { router, useSegments } from 'expo-router';
import type { User } from '@supabase/supabase-js';
import { friendlyAuthError, type FriendlyAuthError } from '../authErrors';
import { cancelAllReminders } from '../notifications';
import { closeWorkspace, openWorkspace, useKalma } from '../store';
import { supabase, supabaseConfigured } from '../supabase';
import { flush, stopSync, syncOnSignIn } from '../sync/engine';

export type AuthStatus = 'loading' | 'signedOut' | 'demo' | 'signedIn';
type Result<T = object> = ({ ok: true } & T) | { ok: false; error: FriendlyAuthError };

const MODE_KEY = 'kalma:mode';
const notConfigured = (): { ok: false; error: FriendlyAuthError } => ({ ok: false, error: friendlyAuthError({ code: 'not_configured' }) });

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  configured: boolean;
  /** true mientras se viene de un enlace de "restablecer contraseña". */
  recovering: boolean;
  /** Error de un enlace de correo vencido o inválido (se muestra en Bienvenida / Iniciar sesión). */
  linkError: FriendlyAuthError | null;
  clearLinkError: () => void;
  signUp: (name: string, email: string, password: string) => Promise<Result<{ needsConfirmation: boolean }>>;
  signIn: (email: string, password: string) => Promise<Result>;
  resendConfirmation: (email: string) => Promise<Result>;
  requestPasswordReset: (email: string) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
  updateName: (name: string) => Promise<Result>;
  /** Intenta enviar lo pendiente; devuelve false si quedaron cambios sin enviar (p. ej. sin internet). */
  syncPending: () => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<Result>;
  enterDemo: () => Promise<void>;
  exitDemo: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

const redirectTo = (path: string) => Linking.createURL(path);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [linkError, setLinkError] = useState<FriendlyAuthError | null>(null);
  const currentUserId = useRef<string | null>(null);

  /* ---------- entrar / salir de espacios ---------- */

  const enterUser = useCallback(async (u: User) => {
    if (currentUserId.current === u.id) return;
    currentUserId.current = u.id;
    stopSync();
    await AsyncStorage.removeItem(MODE_KEY);
    await openWorkspace(`user:${u.id}`);
    const s = useKalma.getState();
    const emptyCache = s.entries.length === 0 && !s.profile.onboarded;
    // En un dispositivo nuevo se espera la descarga (para saber si ya hizo el onboarding); si hay caché, se entra ya.
    if (emptyCache) await Promise.race([syncOnSignIn(u.id), new Promise((r) => setTimeout(r, 6000))]);
    else void syncOnSignIn(u.id);
    const metaName = typeof u.user_metadata?.name === 'string' ? u.user_metadata.name : '';
    if (!useKalma.getState().profile.name && metaName) useKalma.getState().updateProfile({ name: metaName });
    setUser(u);
    setStatus('signedIn');
  }, []);

  const leaveUser = useCallback(async () => {
    stopSync();
    currentUserId.current = null;
    await cancelAllReminders();
    await closeWorkspace({ wipe: true }); // cerrar sesión borra la caché local de esa cuenta
    setUser(null);
    setRecovering(false);
    setStatus('signedOut');
  }, []);

  /* ---------- arranque ---------- */

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          await enterUser(data.session.user);
          return;
        }
      }
      if ((await AsyncStorage.getItem(MODE_KEY)) === 'demo') {
        await openWorkspace('demo');
        if (alive) setStatus('demo');
        return;
      }
      await openWorkspace('none');
      if (alive) setStatus('signedOut');
    })();
    return () => {
      alive = false;
    };
  }, [enterUser]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // No se llama a Supabase dentro del callback (recomendación de supabase-js): se difiere.
      setTimeout(() => {
        if (event === 'PASSWORD_RECOVERY') setRecovering(true);
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session?.user) void enterUser(session.user);
        if (event === 'SIGNED_OUT' && currentUserId.current) void leaveUser();
        if (event === 'USER_UPDATED' && session?.user) setUser(session.user);
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [enterUser, leaveUser]);

  /* ---------- enlaces de correo (kalma:// o exp://) ---------- */

  const url = Linking.useURL();
  useEffect(() => {
    if (!url || !supabase) return;
    const parsed = Linking.parse(url);
    const q = parsed.queryParams ?? {};
    const hash = new URLSearchParams(url.split('#')[1] ?? '');
    const errorCode = (q.error_code as string) ?? hash.get('error_code');
    const isRecovery = (parsed.path ?? '').includes('nueva-contrasena') || hash.get('type') === 'recovery';
    void (async () => {
      if (errorCode) {
        setLinkError(friendlyAuthError({ code: errorCode }));
        return;
      }
      const code = q.code as string | undefined;
      if (code) {
        if (isRecovery) setRecovering(true);
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setRecovering(false);
          setLinkError(friendlyAuthError(error));
        }
        return;
      }
      const access = hash.get('access_token');
      const refresh = hash.get('refresh_token');
      if (access && refresh) {
        if (isRecovery) setRecovering(true);
        const { error } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
        if (error) setLinkError(friendlyAuthError(error));
      }
    })();
  }, [url]);

  /* ---------- redirecciones centralizadas ---------- */

  const segments = useSegments();
  const onboarded = useKalma((s) => s.profile.onboarded);
  useEffect(() => {
    if (status === 'loading') return;
    const group = segments[0] as string | undefined;
    const inAuth = group === '(auth)';
    const inOnboarding = group === '(onboarding)';
    const inCallback = group === 'auth';
    if (status === 'signedOut') {
      if (!inAuth && !inCallback) router.replace('/bienvenida');
      return;
    }
    if (recovering) {
      if (segments[1] !== 'nueva-contrasena') router.replace('/nueva-contrasena');
      return;
    }
    if (status === 'signedIn' && !onboarded) {
      if (!inOnboarding) router.replace('/onboarding');
      return;
    }
    if (inAuth || inCallback || (inOnboarding && status === 'demo')) router.replace('/');
  }, [status, segments, onboarded, recovering]);

  /* ---------- acciones ---------- */

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    configured: supabaseConfigured,
    recovering,
    linkError,
    clearLinkError: () => setLinkError(null),

    signUp: async (name, email, password) => {
      if (!supabase) return notConfigured();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() }, emailRedirectTo: redirectTo('auth/callback') },
      });
      if (error) return { ok: false, error: friendlyAuthError(error) };
      // Sin sesión = la confirmación de correo está activa (o el correo ya existía: mismo mensaje, por privacidad)
      return { ok: true, needsConfirmation: !data.session };
    },

    signIn: async (email, password) => {
      if (!supabase) return notConfigured();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { ok: false, error: friendlyAuthError(error) } : { ok: true };
    },

    resendConfirmation: async (email) => {
      if (!supabase) return notConfigured();
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectTo('auth/callback') } });
      return error ? { ok: false, error: friendlyAuthError(error) } : { ok: true };
    },

    requestPasswordReset: async (email) => {
      if (!supabase) return notConfigured();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo('nueva-contrasena') });
      if (!error) return { ok: true };
      const f = friendlyAuthError(error);
      // Solo se informan problemas de conexión o de límite; nunca si el correo existe o no.
      return f.kind === 'offline' || f.kind === 'rate-limit' ? { ok: false, error: f } : { ok: true };
    },

    updatePassword: async (password) => {
      if (!supabase) return notConfigured();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { ok: false, error: friendlyAuthError(error) };
      setRecovering(false);
      return { ok: true };
    },

    updateName: async (name) => {
      useKalma.getState().updateProfile({ name: name.trim() }); // se sincroniza con profiles por la cola
      if (supabase) await supabase.auth.updateUser({ data: { name: name.trim() } }).catch(() => {});
      return { ok: true };
    },

    syncPending: () => flush(),

    signOut: async () => {
      if (supabase) await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      await leaveUser();
    },

    deleteAccount: async () => {
      if (!supabase) return notConfigured();
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
      if (error) return { ok: false, error: friendlyAuthError(error) };
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      await leaveUser();
      return { ok: true };
    },

    enterDemo: async () => {
      await AsyncStorage.setItem(MODE_KEY, 'demo');
      await openWorkspace('demo');
      setStatus('demo');
    },

    exitDemo: async () => {
      await AsyncStorage.removeItem(MODE_KEY);
      await cancelAllReminders();
      await openWorkspace('none'); // los datos de la demo se conservan para la próxima vez
      setStatus('signedOut');
    },
  }), [status, user, recovering, linkError, leaveUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
