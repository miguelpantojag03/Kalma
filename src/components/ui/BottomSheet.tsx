import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, Text,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { duration, elevation, radius, space, touch, useTheme } from '@/theme';
import { focusForScreenReader } from '@/lib/a11y';
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
}

/**
 * - Android: el botón "atrás" la cierra (onRequestClose) antes de salir de la pantalla.
 * - iOS: accessibilityViewIsModal limita VoiceOver al contenido de la hoja.
 * - Al abrir, el foco del lector va al título.
 * - Con "reducir movimiento" solo cambia la opacidad.
 */
export function BottomSheet({
  open, onClose, title, description, variant = 'sheet', dismissible = true, footer, children,
}: BottomSheetProps) {
  const { c, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  // Se monta en cuanto se abre (estado derivado en render); se desmonta al terminar la animación de salida.
  if (open && !mounted) setMounted(true);
  const p = useSharedValue(0);
  const titleRef = useRef<Text>(null);
  const isSheet = variant === 'sheet';

  useEffect(() => {
    const cfg = { duration: reduce ? 0 : duration.base + 50, easing: Easing.bezier(0.2, 0.8, 0.2, 1) };
    if (open) {
      p.value = withTiming(1, cfg);
      const t = setTimeout(() => {
        focusForScreenReader(titleRef.current);
      }, 350);
      return () => clearTimeout(t);
    }
    p.value = withTiming(0, cfg);
    const t = setTimeout(() => setMounted(false), reduce ? 0 : duration.base + 60);
    return () => clearTimeout(t);
  }, [open, reduce, p]);

  const scrim = useAnimatedStyle(() => ({ opacity: p.value }));
  const panel = useAnimatedStyle(() => {
    if (reduce) return { opacity: p.value };
    return isSheet
      ? { transform: [{ translateY: (1 - p.value) * 600 }] }
      : { opacity: p.value, transform: [{ scale: 0.96 + p.value * 0.04 }] };
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
          {children && (
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          )}
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottom: { justifyContent: 'flex-end' },
  centered: { justifyContent: 'center' },
  panel: { maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: space[3] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingHorizontal: space[5], paddingTop: space[4], paddingBottom: space[2] },
  close: { width: touch.min, height: touch.min, borderRadius: touch.min / 2, alignItems: 'center', justifyContent: 'center', marginRight: -space[2] },
  body: { paddingHorizontal: space[5], paddingVertical: space[2], gap: space[3] },
  footer: { paddingHorizontal: space[5], paddingTop: space[3], gap: space[2] },
});
