/**
 * Estado temporal (no persistido) que cruza pantallas:
 *  - La extracción en curso: si una bandera roja interrumpe el registro y la persona toca
 *    "Ya estoy bien / fue un error", vuelve a la confirmación sin perder lo que dijo.
 *  - Opciones de demo para la sustentación (simular sin conexión).
 */
import { useNetworkState } from 'expo-network';
import { create } from 'zustand';
import type { Entry, Extraction } from './schema';

interface SessionState {
  pending: { transcript: string; source: Entry['source']; extraction: Extraction } | null;
  setPending: (p: SessionState['pending']) => void;
  /** Demo: forzar el estado "sin conexión" aunque haya internet. */
  simulateOffline: boolean;
  setSimulateOffline: (v: boolean) => void;
}

export const useSession = create<SessionState>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
  simulateOffline: false,
  setSimulateOffline: (simulateOffline) => set({ simulateOffline }),
}));

/** true si hay internet (o si la demo no está simulando lo contrario). */
export function useOnline(): boolean {
  const net = useNetworkState();
  const simulateOffline = useSession((s) => s.simulateOffline);
  if (simulateOffline) return false;
  // Mientras se desconoce el estado, asumimos que sí: no bloquear por falta de información.
  return net.isConnected !== false && net.isInternetReachable !== false;
}
