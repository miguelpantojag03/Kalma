import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { KText, Material, tabBarClearance } from '@/components/ui';
import { DemoBanner } from '@/components/DemoBanner';
import { layout, space, useTheme } from '@/theme';

export interface ScreenProps extends ScrollViewProps {
  title?: string;
  subtitle?: string;
  headerAction?: ReactNode;
  /** false para pantallas con layout fijo (registro, emergencia). */
  scroll?: boolean;
  edges?: Edge[];
  /** Pantallas con formularios: el contenido sube con el teclado. */
  keyboard?: boolean;
  /** Pestañas principales: aviso de modo demo y aire para la barra de pestañas flotante. */
  tab?: boolean;
  children: ReactNode;
}

/** Alto de la barra compacta (sin contar el notch). */
const COMPACT_H = 44;

/**
 * Contenedor de pantalla: safe area superior (notch / isla dinámica) y margen lateral del sistema.
 *
 * Título grande que se colapsa (D86): con scroll y título propio, al subir el contenido el título
 * grande se va con él y, justo cuando desaparece, aparece una barra compacta translúcida con el
 * mismo título. Así siempre se sabe dónde estás, sin una franja fija que quite espacio. La barra
 * aparece al ritmo del dedo (va atada al scroll, no a un temporizador) y solo cuando hay contenido
 * debajo: arriba del todo no hay línea ni barra.
 */
export function Screen({
  title, subtitle, headerAction, scroll = true, edges = ['top'], keyboard, tab, children, contentContainerStyle, ...rest
}: ScreenProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const collapsing = scroll && !!title && edges.includes('top');
  const scrollY = useSharedValue(0);
  /** Dónde termina el título grande dentro del contenido. */
  const titleEnd = useSharedValue(80);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  const compact = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [titleEnd.value - 24, titleEnd.value], [0, 1], 'clamp'),
  }));

  const header = title ? (
    <View
      style={styles.header}
      onLayout={(e) => {
        titleEnd.set(e.nativeEvent.layout.y + e.nativeEvent.layout.height - space[2]);
      }}
    >
      <View style={{ flex: 1, gap: space[1] }}>
        <KText variant="title">{title}</KText>
        {!!subtitle && <KText tone="muted">{subtitle}</KText>}
      </View>
      {headerAction}
    </View>
  ) : null;

  const bottomSpace = tab ? { paddingBottom: tabBarClearance(insets.bottom) } : null;

  const body = scroll ? (
    <Animated.ScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      contentContainerStyle={[
        styles.content,
        // Con título que colapsa, el contenido pasa por debajo de la barra de estado
        collapsing && { paddingTop: insets.top },
        bottomSpace,
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      {...rest}
    >
      {tab && <DemoBanner />}
      {header}
      {children}
    </Animated.ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }, bottomSpace]}>
      {tab && <DemoBanner />}
      {header}
      {children}
    </View>
  );

  const content = keyboard ? (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  if (collapsing) {
    return (
      <SafeAreaView edges={edges.filter((e) => e !== 'top')} style={{ flex: 1, backgroundColor: c.bg }}>
        {content}
        {/* Duplica el título (decorativo): el lector de pantalla ya tiene el título grande */}
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.compact, { height: insets.top + COMPACT_H }, compact]}
        >
          <Material style={[StyleSheet.absoluteFill, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]} />
          <View style={[styles.compactTitle, { paddingTop: insets.top }]}>
            <KText variant="label" numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {title}
            </KText>
          </View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[7], gap: space[4] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingTop: space[5], paddingBottom: space[2] },
  compact: { position: 'absolute', top: 0, left: 0, right: 0 },
  compactTitle: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[7] },
});
