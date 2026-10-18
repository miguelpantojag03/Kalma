import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { KText } from '@/components/ui';
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
  /** Pestañas principales: muestran el aviso "Estás explorando con datos de ejemplo" en modo demo. */
  tab?: boolean;
  children: ReactNode;
}

/**
 * Contenedor de pantalla: safe area superior (notch / isla dinámica), margen lateral del sistema
 * y aire inferior para que el contenido no quede bajo la barra de pestañas.
 */
export function Screen({
  title, subtitle, headerAction, scroll = true, edges = ['top'], keyboard, tab, children, contentContainerStyle, ...rest
}: ScreenProps) {
  const { c } = useTheme();
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: space[1] }}>
        <KText variant="title">{title}</KText>
        {!!subtitle && <KText tone="muted">{subtitle}</KText>}
      </View>
      {headerAction}
    </View>
  ) : null;

  const body = scroll ? (
    <ScrollView contentContainerStyle={[styles.content, contentContainerStyle]} keyboardShouldPersistTaps="handled" {...rest}>
      {tab && <DemoBanner />}
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, { flex: 1 }]}>
      {tab && <DemoBanner />}
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[7], gap: space[4] },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], paddingTop: space[5], paddingBottom: space[2] },
});
