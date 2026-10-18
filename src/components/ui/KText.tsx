import type { Ref } from 'react';
import { Text, type TextProps } from 'react-native';
import { typeScale, useTheme, type ColorTokens, type TypeVariant } from '@/theme';

export type TextTone = 'default' | 'muted' | 'brand' | 'warning' | 'danger' | 'onPrimary' | 'onIntensity';

export interface KTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
  center?: boolean;
  ref?: Ref<Text>;
}

const toneColor = (c: ColorTokens, tone: TextTone) =>
  ({
    default: c.text,
    muted: c.muted,
    brand: c.primaryStrong,
    warning: c.warningText,
    danger: c.danger,
    onPrimary: c.onPrimary,
    onIntensity: c.onIntensity,
  })[tone];

/**
 * Texto del sistema de diseño. Los títulos se marcan como `header` para que VoiceOver/TalkBack
 * permitan saltar entre ellos. allowFontScaling queda activo (texto del sistema al máximo).
 */
export function KText({ variant = 'body', tone = 'default', center, style, accessibilityRole, ...rest }: KTextProps) {
  const { c } = useTheme();
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={accessibilityRole ?? (isHeading ? 'header' : undefined)}
      style={[typeScale[variant], { color: toneColor(c, tone) }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
