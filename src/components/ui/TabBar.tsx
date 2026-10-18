import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarDays, House, Sparkles, UserRound, type LucideIcon } from 'lucide-react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { haptic } from '@/lib/haptics';
import { layout, space, touch, typeScale, useTheme } from '@/theme';
import { KText } from './KText';
import { MicButton } from './MicButton';

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

export interface TabBarProps extends BottomTabBarProps {
  onRecord: () => void;
  /** Badges por ruta: número o "dot" (novedad). */
  badges?: Partial<Record<string, number | 'dot'>>;
}

/**
 * Hoy · Calendario · [🎙] · Patrones · Perfil.
 * El micrófono queda al centro, grande y elevado: es la acción más frecuente y cae en la zona
 * natural del pulgar (ley de Fitts); patrón conocido de apps móviles (ley de Jakob).
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
    const Icon = meta.icon;
    const badge = badges[route.name];
    const badgeText = badge === 'dot' ? ', hay novedades' : typeof badge === 'number' && badge > 0 ? `, ${badge} nuevos` : '';
    const options = descriptors[route.key]?.options;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={`${meta.label}${badgeText}`}
        testID={options?.tabBarButtonTestID}
        onPress={() => {
          haptic.tap();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        }}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        style={styles.tab}
      >
        <View style={[styles.pill, focused && { backgroundColor: c.accent }]}>
          <Icon size={24} strokeWidth={focused ? 2.5 : 2} color={focused ? c.text : c.muted} />
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
          {meta.label}
        </KText>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: c.surface, borderTopColor: c.border, paddingBottom: Math.max(insets.bottom, space[2]) },
      ]}
    >
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
  bar: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, paddingTop: space[2], minHeight: layout.tabBarHeight },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: touch.min },
  pill: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  micLift: { marginTop: -touch.mic / 2 },
  badge: { position: 'absolute', borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeDot: { width: 12, height: 12, borderRadius: 6, top: 0, right: 12 },
  badgeNum: { minWidth: 20, height: 20, borderRadius: 10, top: -4, right: 6, paddingHorizontal: 4 },
  badgeLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, lineHeight: 13 },
});
