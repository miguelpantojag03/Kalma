/**
 * Capa de voz. Usa expo-speech-recognition (es-CO) cuando existe:
 *  - APK / development build → módulo nativo.
 *  - Web → Web Speech API del navegador (Chrome).
 *  - Expo Go → NO existe el módulo nativo: `speechAvailable` es false y la app ofrece
 *    ejemplos y texto libre, sin errores (la demo nunca depende del micrófono).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

function loadModule(): SpeechModule | null {
  try {
    if (Platform.OS === 'web') {
      const w = globalThis as unknown as Record<string, unknown>;
      if (!('SpeechRecognition' in w) && !('webkitSpeechRecognition' in w)) return null;
    } else if (!requireOptionalNativeModule('ExpoSpeechRecognition')) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('expo-speech-recognition') as typeof import('expo-speech-recognition')).ExpoSpeechRecognitionModule;
  } catch {
    return null;
  }
}

const mod = loadModule();
export const speechAvailable = mod !== null;

export type PermissionState = 'unknown' | 'undetermined' | 'granted' | 'denied';
export type SpeechStatus = 'idle' | 'listening' | 'done' | 'error';
export type SpeechError = 'no-speech' | 'denied' | 'network' | 'unavailable' | 'other';

export async function getMicPermission(): Promise<PermissionState> {
  if (!mod) return 'unknown';
  try {
    const r = await mod.getPermissionsAsync();
    return r.granted ? 'granted' : r.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unknown';
  }
}

export async function requestMicPermission(): Promise<PermissionState> {
  if (!mod) return 'unknown';
  try {
    const r = await mod.requestPermissionsAsync();
    return r.granted ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

const ERROR_MAP: Record<string, SpeechError> = {
  'no-speech': 'no-speech',
  'not-allowed': 'denied',
  network: 'network',
  'service-not-allowed': 'unavailable',
  'language-not-supported': 'unavailable',
};

interface SpeechCallbacks {
  /** Terminó de escuchar (silencio o stop()) con este texto. */
  onDone?: (transcript: string) => void;
  onError?: (e: SpeechError, transcript: string) => void;
}

/**
 * Hook de reconocimiento. Sin "mantener presionado": start() empieza, el sistema corta solo al
 * detectar silencio (o la persona toca para terminar con stop()). Cada sesión dispara UNA sola vez
 * onDone u onError.
 */
export function useSpeech({ onDone, onError }: SpeechCallbacks = {}) {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<SpeechError | null>(null);

  const statusRef = useRef<SpeechStatus>('idle');
  const textRef = useRef('');
  const cbRef = useRef<SpeechCallbacks>({ onDone, onError });
  useEffect(() => {
    cbRef.current = { onDone, onError };
  }, [onDone, onError]);

  const setBoth = (s: SpeechStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  useEffect(() => {
    if (!mod) return;
    const subs = [
      mod.addListener('result', (e) => {
        const text = e.results[0]?.transcript ?? '';
        textRef.current = text;
        setTranscript(text);
      }),
      // volumechange: −2…10 → 0…1 para la onda y el halo del micrófono
      mod.addListener('volumechange', (e) => setLevel(Math.max(0, Math.min(1, (e.value + 2) / 12)))),
      mod.addListener('end', () => {
        setLevel(0);
        if (statusRef.current !== 'listening') return;
        setBoth('done');
        cbRef.current.onDone?.(textRef.current);
      }),
      mod.addListener('error', (e) => {
        setLevel(0);
        if (e.error === 'aborted' || statusRef.current !== 'listening') return;
        const err = ERROR_MAP[e.error] ?? 'other';
        setError(err);
        setBoth('error');
        cbRef.current.onError?.(err, textRef.current);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);

  const start = useCallback(() => {
    if (!mod) {
      setError('unavailable');
      setBoth('error');
      cbRef.current.onError?.('unavailable', '');
      return;
    }
    textRef.current = '';
    setTranscript('');
    setError(null);
    setBoth('listening');
    mod.start({
      lang: 'es-CO',
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
    });
  }, []);

  const stop = useCallback(() => mod?.stop(), []);
  const abort = useCallback(() => {
    statusRef.current = 'idle';
    mod?.abort();
    setStatus('idle');
    setLevel(0);
  }, []);

  return { status, transcript, level, error, start, stop, abort };
}
