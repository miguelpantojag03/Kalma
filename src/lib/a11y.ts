import { AccessibilityInfo, type HostInstance } from 'react-native';

/**
 * Utilidades de accesibilidad seguras en todas las plataformas.
 * React Native Web no implementa todas las APIs de AccessibilityInfo: se verifica antes de llamar.
 */
export function focusForScreenReader(node: HostInstance | null) {
  if (!node) return;
  const ai = AccessibilityInfo as unknown as { sendAccessibilityEvent?: (n: HostInstance, t: 'focus') => void };
  if (typeof ai.sendAccessibilityEvent === 'function') {
    ai.sendAccessibilityEvent(node, 'focus');
    return;
  }
  // Web: mover el foco del DOM al elemento
  const el = node as unknown as { focus?: () => void };
  el.focus?.();
}

export function announce(message: string) {
  const ai = AccessibilityInfo as unknown as { announceForAccessibility?: (m: string) => void };
  if (typeof ai.announceForAccessibility === 'function') ai.announceForAccessibility(message);
}
