/**
 * Escala de intensidad 0–10. El color NUNCA comunica solo: siempre va con número y palabra
 * (WCAG 1.4.1 Uso del color).
 */
import type { ColorTokens } from '@/theme/tokens';

export function clampIntensity(v: number) {
  return Math.max(0, Math.min(10, Math.round(v)));
}

/** Índice en la escala de 6 colores (0,2,4,6,8,10). */
export function intensityIndex(value: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const v = clampIntensity(value);
  if (v === 0) return 0;
  if (v <= 2) return 1;
  if (v <= 4) return 2;
  if (v <= 6) return 3;
  if (v <= 8) return 4;
  return 5;
}

export const intensityColor = (c: ColorTokens, value: number) => c.intensity[intensityIndex(value)];

/** Alineado con el diccionario de extracción: "un poquito" 2–3, "molesto" 4–6, "fuerte" 7–8, "el peor" 9–10. */
export function intensityWord(value: number): string {
  const v = clampIntensity(value);
  if (v === 0) return 'Nada';
  if (v <= 3) return 'Leve';
  if (v <= 6) return 'Moderado';
  if (v <= 8) return 'Fuerte';
  return 'Muy fuerte';
}

export const intensityA11y = (v: number) => `${clampIntensity(v)} de 10, ${intensityWord(v).toLowerCase()}`;
