import { useCallback, useEffect, useState } from 'react';

/** Cuenta regresiva para "Reenviar" (evita insistir y chocar con el límite de envíos). */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const restart = useCallback(() => setLeft(seconds), [seconds]);
  return { left, ready: left <= 0, restart };
}
