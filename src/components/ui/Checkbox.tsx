import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { haptic } from '@/lib/haptics';
import { radius, space, touch, useTheme } from '@/theme';
import { KText } from './KText';

export interface CheckboxProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: ReactNode;
  /** "Obligatorio" / "Opcional": se muestra en texto, no solo con color. */
  requirement?: 'required' | 'optional';
}

/**
 * Casilla de consentimiento. NUNCA viene marcada por defecto (Ley 1581: consentimiento previo,
 * expreso e informado). Toda la fila es el área táctil.
 */
export function Checkbox({ checked, onChange, label, description, requirement }: CheckboxProps) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${label}${requirement === 'required' ? ', obligatorio' : requirement === 'optional' ? ', opcional' : ''}`}
      onPress={() => {
        haptic.tap();
        onChange(!checked);
      }}
      style={({ pressed }) => [styles.row, { borderColor: checked ? c.primaryStrong : c.border, backgroundColor: pressed ? c.surfaceMuted : c.surface }]}
    >
      <View style={[styles.box, { borderColor: checked ? c.primaryStrong : c.borderStrong, backgroundColor: checked ? c.primaryStrong : 'transparent' }]}>
        {checked && <Check size={18} strokeWidth={3} color={c.onPrimary} />}
      </View>
      <View style={{ flex: 1, gap: space[1] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] }}>
          <KText variant="bodyStrong">{label}</KText>
          {requirement && (
            <KText variant="caption" tone={requirement === 'required' ? 'brand' : 'muted'}>
              {requirement === 'required' ? 'OBLIGATORIO' : 'OPCIONAL'}
            </KText>
          )}
        </View>
        {typeof description === 'string' ? <KText variant="small" tone="muted">{description}</KText> : description}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3], padding: space[4], borderRadius: radius.md, borderWidth: 2, minHeight: touch.min },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
});
