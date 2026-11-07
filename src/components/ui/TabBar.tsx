import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { CalendarDays, House, Sparkles, UserRound, type LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { haptic } from '@/lib/haptics';
import { layout, space, spring, touch, typeScale, useTheme } from '@/theme';
import { KText } from './KText';
import { Material } from './Material';
import { MicButton } from './MicButton';
import { PressableScale } from './PressableScale';

export interface TabMeta {
  label: string;
  icon: LucideIcon;
}

/** Nombres de ruta de src/app/(tabs) → etiqueta e ícono. */
export const TAB_META: Record<string, TabMeta> = {
  index: { label: 'Hoy', icon: House },
  calendario: { label: 'Calendario', icon: CalendarDays },
  patrones: { label: 'Patrones', icon: Sparkles },
  perfil: { label: 'Perfil', icon: UserRound },
};

/** Espacio que el contenido de una pestaña debe dejar abajo (barra + micrófono que sobresale + aire). */
export function tabBarClearance(bottomInset: number) {
  return layout.tabBarHeight + Math.max(bottomInset, space[2]) + touch.mic / 2 + space[4];
}

export interface TabBarProps extends BottomTabBarProps {
  onRecord: () => void;
  /** Badges por ruta: número o "dot" (novedad). */
  badges?: Partial<Record<string, number | 'dot'>>;
}

interface TabItemProps {
  label: string;
  icon: LucideIcon;
  focused: boolean;
  badge?: number | 'dot';
  testID?: string;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ label, icon: Icon, focused, badge, testID, onPress, onLongPress }: TabItemProps) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const p = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    p.value = reduce ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, spring.default);
  }, [focused, reduce, p]);

  // La pastilla nace desde el ícono hacia los lados (anclada a su origen), no aparece de golpe.
  const pill = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scaleX: 0.55 + p.value * 0.45 }],
  }));

  const badgeText = badge === 'dot' ? ', hay novedades' : typeof badge === 'number' && badge > 0 ? `, ${badge} nuevos` : '';

  return (
    <PressableScale
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={`${label}${badgeText}`}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tab}
    >
      <View style={styles.pill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.pillBg, { backgroundColor: c.accent }, pill]} />
        {/* En su propia vista: así queda por encima de la pastilla también en web */}
        <View>
          <Icon size={24} strokeWidth={focused ? 2.5 : 2} color={focused ? c.text : c.muted} />
        </View>
        {badge !== undefined && (badge === 'dot' || badge > 0) && (
          <View
            style={[
              styles.badge,
              badge === 'dot' ? styles.badgeDot : styles.badgeNum,
              { backgroundColor: c.primaryStrong, borderColor: c.surface },
            ]}
          >
            {badge !== 'dot' && (
              <KText tone="onPrimary" style={styles.badgeLabel} maxFontSizeMultiplier={1.2}>
                {badge}
              </KText>
            )}
          </View>
        )}
      </View>
      {/* Etiqueta siempre visible (no solo el ícono) — tope de escala para no romper la barra */}
      <KText
        style={[typeScale.caption, { color: focused ? c.text : c.muted, fontFamily: focused ? 'Inter_700Bold' : 'Inter_500Medium' }]}
        maxFontSizeMultiplier={1.3}
        numberOfLines={1}
      >
        {label}
      </KText>
    </PressableScale>
  );
}

/**
 * Hoy · Calendario · [🎙] · Patrones · Perfil.
 * El micrófono queda al centro, grande y elevado: es la acción más frecuente y cae en la zona
 * natural del pulgar (ley de Fitts); patrón conocido de apps móviles (ley de Jakob).
 * La barra flota sobre el contenido con un material translúcido (D86): el contenido pasa por
 * debajo, por eso cada pestaña deja `tabBarClearance` de aire abajo (lo hace Screen con `tab`).
 */
export function TabBar({ state, descriptors, navigation, insets, onRecord, badges = {} }: TabBarProps) {
  const { c } = useTheme();
  const routes = state.routes.filter((r) => TAB_META[r.name]);
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const renderTab = (route: (typeof routes)[number]) => {
    const index = state.routes.findIndex((r) => r.key === route.key);
    const focused = index === state.index;
    const meta = TAB_META[route.name]!;
    return (
      <TabItem
        key={route.key}
        label={meta.label}
        icon={meta.icon}
        focused={focused}
        badge={badges[route.name]}
        testID={descriptors[route.key]?.options?.tabBarButtonTestID}
        onPress={() => {
          haptic.tap();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
      />
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space[2]) }]}
    >
      {/* El material va detrás y no recorta: el micrófono sobresale por arriba */}
      <Material pointerEvents="none" style={[StyleSheet.absoluteFill, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]} />
      {left.map(renderTab)}
      <View style={styles.center}>
        <View style={styles.micLift}>
          <MicButton size="nav" label="Registrar por voz" onPress={onRecord} />
        </View>
        <KText variant="caption" tone="brand" style={{ fontFamily: 'Inter_700Bold' }} maxFontSizeMultiplier={1.3} importantForAccessibility="no">
          Registrar
        </KText>
      </View>
      {right.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'flex-end', paddingTop: space[2], minHeight: layout.tabBarHeight,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: touch.min },
  pill: { width: 56, height: 32, alignItems: 'center', justifyContent: 'center' },
  pillBg: { borderRadius: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  micLift: { marginTop: -touch.mic / 2 },
  badge: { position: 'absolute', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { width: 12, height: 12, borderRadius: 6, top: 0, right: 12 },
  badgeNum: { minWidth: 20, height: 20, borderRadius: 10, top: -4, right: 6, paddingHorizontal: 4 },
  badgeLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 13 },
});
