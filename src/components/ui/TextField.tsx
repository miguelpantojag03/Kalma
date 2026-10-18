import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { announce } from '@/lib/a11y';
import { fontFamily, radius, space, useTheme } from '@/theme';
import { KText } from './KText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  /** Qué pasó + qué hacer. Se anuncia al lector de pantalla cuando aparece. */
  error?: string;
  /** Oculta la etiqueta visible (sigue siendo el nombre accesible). */
  hideLabel?: boolean;
  /** Contenido a la derecha dentro del campo (p. ej. "Mostrar" en contraseñas). */
  trailing?: ReactNode;
  ref?: Ref<TextInputInstance>;
}

/**
 * Campo de texto del sistema. Estados: default · foco (borde de 3 px primaryStrong) · error (ámbar,
 * con mensaje) · deshabilitado (editable={false}, 50 % de opacidad).
 * Por defecto es multilínea (alternativa por texto a la voz); los formularios usan multiline={false}.
 */
export function TextField({ label, hint, error, hideLabel, trailing, style, multiline = true, editable = true, onFocus, onBlur, ref, ...rest }: TextFieldProps) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);

  // VoiceOver no anuncia regiones vivas como TalkBack: se anuncia explícitamente al aparecer un error.
  const lastError = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (error && error !== lastError.current) announce(`${label}: ${error}`);
    lastError.current = error;
  }, [error, label]);

  return (
    <View style={{ gap: space[2], opacity: editable ? 1 : 0.5 }}>
      {!hideLabel && <KText variant="subheading" importantForAccessibility="no">{label}</KText>}
      {!!hint && <KText variant="small" tone="muted" importantForAccessibility="no">{hint}</KText>}
      <View
        style={[
          styles.box,
          {
            backgroundColor: c.surface,
            borderColor: error ? c.warning : focused ? c.primaryStrong : c.borderStrong,
            borderWidth: focused ? 3 : 2,
            minHeight: multiline ? 104 : 52,
          },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityHint={[hint, error].filter(Boolean).join('. ') || undefined}
          accessibilityState={{ disabled: !editable }}
          multiline={multiline}
          editable={editable}
          placeholderTextColor={c.muted}
          selectionColor={c.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          // En web el foco ya lo marca el borde de 3 px de la caja: se quita el contorno del navegador
          style={[styles.input, { color: c.text, textAlignVertical: multiline ? 'top' : 'center' }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object), style]}
          {...rest}
        />
        {trailing}
      </View>
      {!!error && (
        <View style={styles.err} accessibilityLiveRegion="polite">
          <View style={[styles.dot, { backgroundColor: c.warning }]} />
          <KText variant="smallStrong" tone="warning" style={{ flex: 1 }}>{error}</KText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.md },
  input: {
    flex: 1,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    fontFamily: fontFamily.body,
    fontSize: 16,
    lineHeight: 24,
  },
  err: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
