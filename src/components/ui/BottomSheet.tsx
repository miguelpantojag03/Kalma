import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, Text, useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { elevation, project, radius, rubberband, space, spring, touch, useTheme } from '@/theme';
import { focusForScreenReader } from '@/lib/a11y';
import { haptic } from '@/lib/haptics';
import { KText } from './KText';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** "sheet" sube desde abajo (zona del pulgar). "dialog" es una confirmación centrada. */
  variant?: 'sheet' | 'dialog';
  /** false para flujos que no deben cerrarse por accidente (p. ej. borrar datos). */
  dismissible?: boolean;
  footer?: ReactNode;
  children?: ReactNode;
  /** Se llama cuando la hoja terminó de salir y el modal ya no está (p. ej. para abrir la cámara en iOS). */
  onClosed?: () => void;
}

/**
 * Hoja física (D85):
 * - Entra y sale por el mismo camino (abajo) con un resorte sin rebote.
 * - Se arrastra desde la manija o el título, pegada al dedo. Hacia arriba resiste (no hay más).
 * - Al soltar se proyecta el impulso: un movimiento rápido hacia abajo la cierra aunque haya
 *   bajado poco; si no, vuelve. En ambos casos sigue con la velocidad del dedo (sin "costura").
 * - Se puede volver a agarrar mientras se mueve; la animación siempre parte de donde se ve.
 * - Android: el botón "atrás" la cierra. iOS: accessibilityViewIsModal limita VoiceOver a la hoja.
 * - Arrastrar nunca es la única forma de cerrar: está el botón "Cerrar" y el fondo.
 * - Con "reducir movimiento" entra y sale con un fundido; el arrastre (lo mueve la persona) sigue.
 */
export function BottomSheet({
  open, onClose, title, description, variant = 'sheet', dismissible = true, footer, children, onClosed,
}: BottomSheetProps) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const { height: winH } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  // Se monta en cuanto se abre (estado derivado en render); se desmonta al terminar la salida.
  if (open && !mounted) setMounted(true);
  const titleRef = useRef<Text>(null);
  const isSheet = variant === 'sheet';

  /** Desplazamiento de la hoja: 0 = abierta, panelH = fuera de pantalla. */
  const y = useSharedValue(winH);
  /** Opacidad de la hoja (dialog y "reducir movimiento"). */
  const fade = useSharedValue(0);
  const panelH = useSharedValue(winH);
  const dragStart = useSharedValue(0);
  /** La cerró un gesto: el efecto de cierre no debe reiniciar la animación (perdería la velocidad). */
  const closingByGesture = useSharedValue(false);

  const unmount = () => setMounted(false);

  const wasMounted = useRef(mounted);
  useEffect(() => {
    if (wasMounted.current && !mounted) onClosed?.();
    wasMounted.current = mounted;
  }, [mounted, onClosed]);

  useEffect(() => {
    if (open) {
      closingByGesture.set(false);
      if (reduce || !isSheet) {
        y.value = 0;
        fade.value = withTiming(1, { duration: reduce ? 200 : 220 });
      } else {
        fade.value = 1;
        y.value = withSpring(0, spring.sheet);
      }
      const t = setTimeout(() => focusForScreenReader(titleRef.current), 350);
      return () => clearTimeout(t);
    }
    if (closingByGesture.get()) return;
    const done = (finished?: boolean) => {
      'worklet';
      if (finished) scheduleOnRN(unmount);
    };
    if (reduce || !isSheet) {
      fade.value = withTiming(0, { duration: 180 }, done);
    } else {
      // Sale por donde entró, desde donde esté ahora mismo.
      y.value = withSpring(panelH.value + 40, spring.sheet, done);
    }
  }, [open, reduce, isSheet, y, fade, panelH, closingByGesture]);

  const finishGestureClose = () => {
    haptic.stop();
    onClose();
  };

  const pan = Gesture.Pan()
    .enabled(isSheet && dismissible)
    // Umbral pequeño antes de decidir que es un arrastre vertical (histéresis).
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onBegin(() => {
      // Agarrarla en pleno movimiento la detiene donde está (interrumpible).
      cancelAnimation(y);
      dragStart.set(y.get());
    })
    .onUpdate((e) => {
      const next = dragStart.get() + e.translationY;
      // Hacia arriba no hay más hoja: resistencia progresiva en vez de un tope duro.
      y.set(next < 0 ? -rubberband(-next, panelH.get()) : next);
    })
    .onEnd((e) => {
      const h = panelH.get();
      // ¿Dónde terminaría si la soltara así? Se decide con eso, no con donde quedó el dedo.
      const projected = y.get() + project(e.velocityY);
      const dismiss = projected > h * 0.5 && e.velocityY > -200;
      const target = dismiss ? h + 40 : 0;
      // Hubo impulso: ahora sí un poco de rebote, y la velocidad del dedo pasa al resorte.
      if (dismiss) closingByGesture.set(true);
      y.set(withSpring(target, { ...spring.sheetFling, velocity: e.velocityY }, (finished) => {
        if (dismiss && finished) scheduleOnRN(unmount);
      }));
      if (dismiss) scheduleOnRN(finishGestureClose);
    });

  const scrim = useAnimatedStyle(() => ({
    opacity: isSheet && !reduce ? fade.value * interpolate(y.value, [0, panelH.value], [1, 0], 'clamp') : fade.value,
  }));
  const panel = useAnimatedStyle(() => {
    if (!isSheet) return { opacity: fade.value, transform: [{ scale: 0.96 + fade.value * 0.04 }] };
    return { opacity: fade.value, transform: [{ translateY: y.value }] };
  });

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      {/* Dentro de un Modal los gestos necesitan su propia raíz (Android). */}
      <GestureHandlerRootView style={styles.root}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.root, isSheet ? styles.bottom : styles.centered]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrim]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={dismissible ? onClose : undefined}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Animated.View>

          <Animated.View
            accessibilityViewIsModal
            onLayout={(e) => {
              panelH.set(e.nativeEvent.layout.height);
            }}
            style={[
              styles.panel,
              { backgroundColor: c.surface },
              isSheet
                ? { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingBottom: Math.max(insets.bottom, space[4]) }
                : { borderRadius: radius.lg, marginHorizontal: space[4], maxWidth: 420, alignSelf: 'center', width: '100%' },
              elevation(3, scheme),
              panel,
            ]}
          >
            <GestureDetector gesture={pan}>
              <View>
                {isSheet && <View style={[styles.grabber, { backgroundColor: c.borderStrong }]} />}
                <View style={styles.header}>
                  <View style={{ flex: 1, gap: space[1] }}>
                    <KText ref={titleRef} variant="heading">{title}</KText>
                    {!!description && <KText tone="muted">{description}</KText>}
                  </View>
                  {dismissible && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Cerrar"
                      onPress={onClose}
                      style={({ pressed }) => [styles.close, pressed && { backgroundColor: c.surfaceMuted }]}
                    >
                      <X size={24} color={c.muted} />
                    </Pressable>
                  )}
                </View>
              </View>
            </GestureDetector>
            {children && (
              <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            )}
            {footer && <View style={styles.footer}>{footer}</View>}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottom: { justifyContent: 'flex-end' },
  centered: { justifyContent: 'center' },
  panel: { maxHeight: '90%' },
  // La manija es más ancha y tiene más área para agarrarla
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: space[3] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[2] },
  close: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', marginRight: -space[2] },
  body: { paddingHorizontal: space[5], paddingVertical: space[2], gap: space[3] },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], gap: space[2] },
});
