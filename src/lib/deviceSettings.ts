/**
 * Ajustes de ESTE dispositivo (no se sincronizan con la cuenta): bloqueo con huella/Face ID y si
 * el recordatorio del check-in está encendido. Viven aparte del store de datos de salud.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface DeviceSettings {
  biometricLock: boolean;
  checkinReminder: boolean;
  setBiometricLock: (v: boolean) => void;
  setCheckinReminder: (v: boolean) => void;
}

export const useDeviceSettings = create<DeviceSettings>()(
  persist(
    (set) => ({
      biometricLock: false,
      checkinReminder: true,
      setBiometricLock: (biometricLock) => set({ biometricLock }),
      setCheckinReminder: (checkinReminder) => set({ checkinReminder }),
    }),
    { name: 'kalma:device', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export type BiometricAvailability = 'ok' | 'no-hardware' | 'not-enrolled' | 'unsupported';

export async function biometricAvailability(): Promise<BiometricAvailability> {
  if (Platform.OS === 'web') return 'unsupported';
  try {
    if (!(await LocalAuthentication.hasHardwareAsync())) return 'no-hardware';
    if (!(await LocalAuthentication.isEnrolledAsync())) return 'not-enrolled';
    return 'ok';
  } catch {
    return 'unsupported';
  }
}

/** Pide huella/Face ID; si el equipo no tiene, permite el PIN del celular. */
export async function unlock(reason = 'Desbloquea Kalma para ver tus registros'): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancelar', disableDeviceFallback: false });
    return r.success;
  } catch {
    return false;
  }
}
