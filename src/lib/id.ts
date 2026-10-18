import * as Crypto from 'expo-crypto';

/** UUID v4. Los ids viajan a Supabase, así que deben ser únicos entre dispositivos y usuarios. */
export function uuid(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    // Respaldo (pruebas o plataformas sin crypto nativo)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
      const r = (Math.random() * 16) | 0;
      return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
