import { router } from 'expo-router';

/** Cierra un modal; si no hay pantalla anterior (p. ej. se abrió por enlace), vuelve a Hoy. */
export function closeModal() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
