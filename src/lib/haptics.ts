import * as Haptics from 'expo-haptics';

/**
 * Háptica con propósito: confirma acciones sin mirar la pantalla.
 * Nunca es el único feedback (hay texto y estado visual), y falla en silencio si no hay motor.
 */
export const haptic = {
  tap: () => Haptics.selectionAsync().catch(() => {}),
  start: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  stop: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};
