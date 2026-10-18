/**
 * Exportar mis datos (derecho de acceso, Ley 1581): un JSON legible con todo lo de la cuenta
 * actual, compartido por la hoja nativa. No incluye contraseñas (Kalma nunca las guarda).
 */
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { KalmaData } from './store';

export function buildExport(d: Pick<KalmaData, 'profile' | 'consent' | 'entries' | 'experiments'>, email: string | null) {
  return {
    exportado: new Date().toISOString(),
    aplicacion: 'Kalma',
    cuenta: { nombre: d.profile.name, correo: email },
    perfil: d.profile,
    consentimientos: d.consent,
    registros: d.entries,
    experimentos: d.experiments,
    nota: 'Registro generado por el paciente. No constituye diagnóstico.',
  };
}

/** Devuelve false si la plataforma no permite compartir archivos (web). */
export async function shareExport(d: Pick<KalmaData, 'profile' | 'consent' | 'entries' | 'experiments'>, email: string | null): Promise<boolean> {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, `kalma-mis-datos-${new Date().toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(buildExport(d, email), null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Exportar mis datos de Kalma' });
  return true;
}
