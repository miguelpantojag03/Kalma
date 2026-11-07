import type { TextStyle } from 'react-native';

/**
 * Nunito (redondeada, cálida) para títulos; Inter para texto por su legibilidad en pantallas pequeñas.
 * En Android, fontWeight no elige la variante de una fuente personalizada: cada peso es su propia familia.
 */
export const fontFamily = {
  display: 'Nunito_700Bold',
  displayHeavy: 'Nunito_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_700Bold',
} as const;

/**
 * Escala 12/14/16/18/22/28/34. allowFontScaling queda activo: estos son tamaños base.
 *
 * Tracking (letterSpacing) según el tamaño, nunca uno solo para todo (D87): los títulos grandes
 * se ven separados si no se aprietan (negativo); el texto pequeño gana legibilidad con un poco
 * más de aire (positivo); el cuerpo queda en 0. El interlineado va al revés del tamaño:
 * apretado en títulos (≈1.15), cómodo en párrafos (1.5).
 */
export const typeScale = {
  display: { fontFamily: fontFamily.displayHeavy, fontSize: 34, lineHeight: 39, letterSpacing: -0.6 },
  title: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 33, letterSpacing: -0.4 },
  heading: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 27, letterSpacing: -0.2 },
  subheading: { fontFamily: fontFamily.display, fontSize: 18, lineHeight: 23, letterSpacing: -0.1 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodyStrong: { fontFamily: fontFamily.bodyBold, fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  small: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  smallStrong: { fontFamily: fontFamily.bodyBold, fontSize: 14, lineHeight: 20, letterSpacing: 0.1 },
  /** Solo etiquetas cortas y leyendas, nunca párrafos. */
  caption: { fontFamily: fontFamily.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  label: { fontFamily: fontFamily.display, fontSize: 16, lineHeight: 20, letterSpacing: 0 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;
