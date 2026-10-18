/**
 * Cliente de Supabase (autenticación + base de datos con RLS).
 *
 * - La anon key es pública por diseño: la seguridad la dan las políticas RLS de cada tabla.
 *   La service_role NUNCA está en la app (solo en la Edge Function de eliminar cuenta).
 * - Sesión persistente y segura: SecureStore tiene un límite de ~2 KB por valor y una sesión de
 *   Supabase suele ser más grande. Patrón recomendado por Supabase (LargeSecureStore): una clave
 *   AES-256 aleatoria en SecureStore y la sesión cifrada con ella en AsyncStorage.
 * - Si faltan las variables de entorno, `supabase` es null y la app sigue funcionando en modo demo.
 */
import 'react-native-url-polyfill/auto';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import aesjs from 'aes-js';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!url && !!anonKey && !url.includes('TU-PROYECTO');

class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    const encryptionKey = Crypto.getRandomBytes(256 / 8);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return null;
    const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(encryptionKeyHex), new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(key, encrypted);
  }

  async setItem(key: string, value: string) {
    // Cada escritura usa una clave nueva (no se reutiliza el contador CTR con la misma clave).
    await AsyncStorage.setItem(key, await this.encrypt(key, value));
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // En web el navegador guarda la sesión (SecureStore no existe en web).
        storage: Platform.OS === 'web' ? undefined : new LargeSecureStore(),
        autoRefreshToken: true,
        persistSession: true,
        // Los enlaces de correo los procesa AuthProvider (deep link kalma://), no la URL de la página.
        detectSessionInUrl: false,
        flowType: 'pkce',
        lock: processLock,
      },
    })
  : null;

// Refresca la sesión solo con la app en primer plano (recomendación de Supabase para móvil).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
