import type { ViewStyle } from 'react-native';

/**
 * Sombras difusas con tinte verde. `boxShadow` funciona igual en iOS y Android con la
 * Nueva Arquitectura (RN ≥ 0.76), así no mantenemos `elevation` y `shadow*` por separado.
 */
export function elevation(level: 0 | 1 | 2 | 3, scheme: 'light' | 'dark'): ViewStyle {
  if (level === 0) return {};
  if (scheme === 'dark') {
    return { boxShadow: ['', '0 1px 3px rgba(0,0,0,0.35)', '0 4px 16px rgba(0,0,0,0.4)', '0 12px 40px rgba(0,0,0,0.55)'][level] };
  }
  return {
    boxShadow: [
      '',
      '0 1px 2px rgba(31,42,46,0.06), 0 2px 8px rgba(79,117,102,0.08)',
      '0 4px 16px rgba(79,117,102,0.14)',
      '0 12px 40px rgba(31,42,46,0.2)',
    ][level],
  };
}
