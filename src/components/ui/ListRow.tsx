import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { radius, space, touch, useTheme } from '@/theme';
import { haptic } from '@/lib/haptics';
import { KText } from './KText';

export interface ListRowProps {
  icon?: LucideIcon;
  label: string;
  description?: string;
  /** Contenido a la derecha (un Switch, un valor). Si no hay y hay onPress, se muestra una flecha. */
  trailing?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

/** Fila de ajustes/navegación: toda la fila es el área táctil (Fitts). */
export function ListRow({ icon: Icon, label, description, trailing, onPress, disabled }: ListRowProps) {
  const { c } = useTheme();
  const content = (
    <>
      {Icon && (
        <View style={[styles.icon, { backgroundColor: c.accent }]}>
          <Icon size={20} color={c.text} />
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <KText variant="bodyStrong">{label}</KText>
        {!!description && <KText variant="small" tone="muted">{description}</KText>}
      </View>
      {trailing ?? (onPress ? <ChevronRight size={20} color={c.muted} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceMuted : 'transparent', opacity: disabled ? 0.5 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: touch.min + 8, paddingVertical: space[2], paddingHorizontal: space[2], borderRadius: radius.md },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
