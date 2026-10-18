/**
 * Kalma — design tokens ("calma clínica cálida").
 * El contraste de cada par de uso está verificado en src/theme/__tests__/contrast.test.ts.
 *
 * Reglas que salieron de medir el contraste:
 *  - primary NO lleva texto blanco encima (3.54:1). Botones => primaryStrong + onPrimary.
 *  - primary NO es color de texto (3.47:1 sobre bg). Texto de marca => primaryStrong.
 *  - primaryStrong NO va como texto sobre accent en claro (3.84:1). Sobre accent => text.
 *  - warning es solo fondo/punto. Texto de advertencia => warningText.
 *  - border es decorativo. Límites de controles => borderStrong (≥ 3:1).
 *  - Intensidad: siempre texto onIntensity + número visible.
 */

export interface ColorTokens {
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  accent: string;
  onPrimary: string;
  bg: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  muted: string;
  border: string;
  borderStrong: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  dangerSoft: string;
  onDanger: string;
  focus: string;
  scrim: string;
  /** Escala 0, 2, 4, 6, 8, 10 */
  intensity: readonly [string, string, string, string, string, string];
  onIntensity: string;
}

export const light: ColorTokens = {
  primary: '#6B9080',
  primaryStrong: '#4F7566',
  primarySoft: '#A4C3B2',
  accent: '#CCE3DE',
  onPrimary: '#FFFFFF',
  bg: '#F6FFF8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF6F1',
  text: '#1F2A2E',
  muted: '#5F6E73',
  border: '#DDE7E3',
  borderStrong: '#7A8B87',
  warning: '#E9A23B',
  warningSoft: '#FCEFD9',
  warningText: '#8A5A12',
  danger: '#C0392B',
  dangerSoft: '#FBE9E7',
  onDanger: '#FFFFFF',
  focus: '#4F7566',
  scrim: 'rgba(18,25,26,0.45)',
  intensity: ['#EAF4F4', '#DCEFD8', '#F6E7A8', '#F4C47A', '#EC9A6E', '#E07A5F'],
  onIntensity: '#1F2A2E',
};

export const dark: ColorTokens = {
  ...light,
  primary: '#8FB8A8',
  primaryStrong: '#A9CDBE', // con onPrimary oscuro = 10.31:1 (con blanco sería 1.73:1)
  primarySoft: '#3E5A50',
  accent: '#24403A',
  onPrimary: '#12191A',
  bg: '#12191A',
  surface: '#1B2426',
  surfaceMuted: '#222D2F',
  text: '#E8F0EE',
  muted: '#9DB0AB',
  border: '#2B3739',
  borderStrong: '#5F7470',
  warningSoft: '#3A2F1C',
  warningText: '#E9A23B',
  danger: '#E57368',
  dangerSoft: '#3A2220',
  onDanger: '#12191A',
  focus: '#A9CDBE',
  scrim: 'rgba(0,0,0,0.6)',
  // La escala de intensidad se mantiene igual en oscuro para que un "7" se vea igual siempre.
};

export const radius = { sm: 12, md: 16, lg: 24, full: 999 } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;

export const duration = { fast: 150, base: 250, slow: 600, breath: 4000 } as const;

/** Curva de salida suave: equivalente a cubic-bezier(.2,.8,.2,1). */
export const easing = [0.2, 0.8, 0.2, 1] as const;

/** Áreas táctiles: 44 pt (iOS HIG) / 48 dp (Material 3). Usamos 48 como mínimo común. */
export const touch = { min: 48, mic: 72, micHero: 96 } as const;

export const layout = {
  /** Margen lateral de pantalla. */
  gutter: space[4],
  tabBarHeight: 64,
} as const;

export type Theme = {
  scheme: 'light' | 'dark';
  c: ColorTokens;
};
