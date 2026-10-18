import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { Bell, CircleCheck, Info, TriangleAlert, WifiOff, X, type LucideIcon } from 'lucide-react-native';
import { create } from 'zustand';
import { elevation, layout, radius, space, touch, useTheme, type ColorTokens } from '@/theme';
import { announce } from '@/lib/a11y';
import { KText } from './KText';

export type FeedbackTone = 'success' | 'info' | 'warning' | 'offline' | 'error' | 'reminder';

function toneStyle(c: ColorTokens, tone: FeedbackTone): { icon: LucideIcon; bg: string; border: string; iconColor: string } {
  switch (tone) {
    case 'success': return { icon: CircleCheck, bg: c.accent, border: c.accent, iconColor: c.text };
    case 'info': return { icon: Info, bg: c.surface, border: c.border, iconColor: c.primaryStrong };
    case 'reminder': return { icon: Bell, bg: c.surface, border: c.primary, iconColor: c.primaryStrong };
    case 'warning': return { icon: TriangleAlert, bg: c.warningSoft, border: c.warningSoft, iconColor: c.warningText };
    case 'offline': return { icon: WifiOff, bg: c.surfaceMuted, border: c.borderStrong, iconColor: c.muted };
    // Error recuperable de la app: ámbar, NO rojo (el rojo es solo para emergencias, D03).
    case 'error': return { icon: TriangleAlert, bg: c.warningSoft, border: c.warning, iconColor: c.warningText };
  }
}

/* ---------- Banner: mensaje persistente en línea ---------- */

export interface BannerProps {
  tone?: FeedbackTone;
  title: string;
  message?: string;
  actions?: ReactNode;
  onDismiss?: () => void;
}

export function Banner({ tone = 'info', title, message, actions, onDismiss }: BannerProps) {
  const { c } = useTheme();
  const t = toneStyle(c, tone);
  const Icon = t.icon;
  return (
    <View
      accessibilityRole={tone === 'error' || tone === 'offline' ? 'alert' : 'summary'}
      accessibilityLiveRegion={tone === 'error' || tone === 'offline' ? 'assertive' : 'polite'}
      style={[styles.banner, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Icon size={20} color={t.iconColor} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: space[1] }}>
        <KText variant="bodyStrong">{title}</KText>
        {!!message && <KText variant="small" tone="muted">{message}</KText>}
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
      {onDismiss && (
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar aviso" onPress={onDismiss} style={styles.close}>
          <X size={20} color={c.muted} />
        </Pressable>
      )}
    </View>
  );
}

/* ---------- Toast: confirmación breve ---------- */

interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'info' | 'offline' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  current: ToastItem | null;
  show: (t: Omit<ToastItem, 'id' | 'tone'> & { tone?: ToastItem['tone'] }) => void;
  hide: () => void;
}

/** toast.show({ message: 'Listo, lo guardé', actionLabel: 'Deshacer', onAction }) desde cualquier pantalla. */
export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (t) => set({ current: { id: Date.now(), tone: 'success', ...t } }),
  hide: () => set({ current: null }),
}));

/**
 * Se monta una vez en el layout raíz. Con acción da 7 s (WCAG 2.2.1); sin acción, 4 s.
 * Se anuncia al lector de pantalla además de mostrarse.
 */
export function ToastHost({ bottomOffset = layout.tabBarHeight + space[5] }: { bottomOffset?: number }) {
  const { current, hide } = useToast();
  const { c, scheme } = useTheme();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!current) return;
    announce(current.message);
    const t = setTimeout(hide, current.actionLabel ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [current, hide]);

  if (!current) return null;
  const Icon = toneStyle(c, current.tone).icon;

  return (
    <Animated.View
      key={current.id}
      entering={reduce ? FadeIn : SlideInDown.duration(250)}
      exiting={reduce ? FadeOut : SlideOutDown.duration(200)}
      pointerEvents="box-none"
      style={[styles.toastWrap, { bottom: bottomOffset }]}
    >
      <View style={[styles.toast, { backgroundColor: c.text }, elevation(3, scheme)]}>
        <Icon size={20} color={c.bg} />
        <KText style={{ color: c.bg, flex: 1, paddingVertical: space[2] }}>{current.message}</KText>
        {current.actionLabel && current.onAction && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={current.actionLabel}
            onPress={() => {
              current.onAction?.();
              hide();
            }}
            style={styles.toastAction}
          >
            <KText variant="bodyStrong" style={{ color: c.bg, textDecorationLine: 'underline' }}>
              {current.actionLabel}
            </KText>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], padding: space[4], borderRadius: radius.md, borderWidth: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
  close: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center', marginTop: -space[3], marginRight: -space[3] },
  toastWrap: { position: 'absolute', left: space[4], right: space[4], alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space[3], width: '100%', maxWidth: 420, borderRadius: radius.md, paddingLeft: space[4], paddingRight: space[2], paddingVertical: space[1] },
  toastAction: { minHeight: touch.min, justifyContent: 'center', paddingHorizontal: space[3] },
});
