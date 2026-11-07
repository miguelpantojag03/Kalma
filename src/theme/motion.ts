/**
 * Movimiento de Kalma: resortes en vez de animaciones con duración fija (D84).
 *
 * Apple describe un resorte con dos números: amortiguación (1 = sin rebote) y respuesta
 * (qué tan rápido llega). Reanimated usa los mismos: `dampingRatio` y `duration`
 * (duración "perceptual" en ms). Un resorte siempre arranca del valor que se ve en pantalla
 * y hereda la velocidad, así que cualquier animación se puede interrumpir sin saltos.
 *
 * Regla: amortiguación 1 por defecto. Rebote (0.8) solo si el gesto traía impulso
 * (soltar una hoja que se arrastraba). Nada rebota por aparecer solo.
 */
export const spring = {
  /** Mover, aparecer, cambiar de estado. Sin rebote. */
  default: { dampingRatio: 1, duration: 400 },
  /** Hoja/diálogo que entra o sale sin gesto. */
  sheet: { dampingRatio: 1, duration: 380 },
  /** Hoja soltada después de arrastrarla: un poco de rebote, porque hubo impulso. */
  sheetFling: { dampingRatio: 0.8, duration: 320 },
  /** Al presionar: casi inmediato. */
  press: { dampingRatio: 1, duration: 120 },
  /** Al soltar: vuelve con calma. */
  release: { dampingRatio: 1, duration: 300 },
} as const;

/** Cuánto se encoge algo al presionarlo. Las superficies grandes se mueven menos. */
export const pressScale = { control: 0.96, card: 0.985 } as const;

/**
 * Dónde terminaría algo lanzado con esta velocidad (px/s), como el scroll al soltarlo.
 * Es la función de Apple (decaimiento exponencial), no la fórmula de física v²/2a.
 */
export function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistencia progresiva más allá de un límite: mientras más se pasa, menos sigue al dedo. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
