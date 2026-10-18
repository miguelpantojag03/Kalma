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

/** Escala 12/14/16/18/22/28/34. allowFontScaling queda activo: estos son tamaños base. */
export const typeScale = {
  display: { fontFamily: fontFamily.displayHeavy, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34 },
  heading: { fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28 },
  subheading: { fontFamily: fontFamily.display, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fontFamily.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: fontFamily.bodyBold, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20 },
  smallStrong: { fontFamily: fontFamily.bodyBold, fontSize: 14, lineHeight: 20 },
  /** Solo etiquetas cortas y leyendas, nunca párrafos. */
  caption: { fontFamily: fontFamily.bodyMedium, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fontFamily.display, fontSize: 16, lineHeight: 20 },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof typeScale;
