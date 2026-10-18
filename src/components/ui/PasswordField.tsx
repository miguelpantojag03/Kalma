import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, Circle, Eye, EyeOff } from 'lucide-react-native';
import { passwordRules } from '@/lib/validation';
import { space, touch, useTheme } from '@/theme';
import { KText } from './KText';
import { TextField, type TextFieldProps } from './TextField';

export interface PasswordFieldProps extends Omit<TextFieldProps, 'secureTextEntry' | 'multiline' | 'trailing'> {
  /** "new" para crear o cambiar (los gestores de contraseñas sugieren una) · "current" para iniciar sesión. */
  purpose: 'new' | 'current';
}

/**
 * Contraseña con botón Mostrar/Ocultar. En lugar de pedir "confirmar contraseña", se puede ver lo
 * que se escribió (D51). Con textContentType/autoComplete correctos para gestores de contraseñas.
 */
export function PasswordField({ purpose, label, ...rest }: PasswordFieldProps) {
  const { c } = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      label={label}
      multiline={false}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType={purpose === 'new' ? 'newPassword' : 'password'}
      autoComplete={purpose === 'new' ? 'new-password' : 'current-password'}
      passwordRules={purpose === 'new' ? 'minlength: 8; required: lower; required: digit;' : undefined}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          accessibilityState={{ selected: visible }}
          onPress={() => setVisible((v) => !v)}
          style={{ minWidth: touch.min, minHeight: touch.min, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[3] }}
        >
          {visible ? <EyeOff size={22} color={c.muted} /> : <Eye size={22} color={c.muted} />}
        </Pressable>
      }
      {...rest}
    />
  );
}

/**
 * Requisitos de contraseña como lista que se va marcando mientras se escribe (no son errores:
 * es progreso). Ícono + texto, no solo color (WCAG 1.4.1).
 */
export function PasswordRequirements({ password }: { password: string }) {
  const { c } = useTheme();
  const rules = passwordRules(password);
  return (
    <View
      style={{ gap: space[1] }}
      accessible
      accessibilityLabel={`Requisitos: ${rules.map((r) => `${r.label}, ${r.ok ? 'cumplido' : 'pendiente'}`).join('. ')}`}
    >
      {rules.map((r) => (
        <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          {r.ok ? <Check size={18} strokeWidth={3} color={c.primaryStrong} /> : <Circle size={16} color={c.borderStrong} />}
          <KText variant="small" tone={r.ok ? 'default' : 'muted'} style={r.ok ? { fontFamily: 'Inter_500Medium' } : undefined}>
            {r.label}
          </KText>
        </View>
      ))}
    </View>
  );
}
