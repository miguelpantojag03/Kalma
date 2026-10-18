import { View, type ViewProps } from 'react-native';
import { elevation, radius, space, useTheme } from '@/theme';

export interface CardProps extends ViewProps {
  tone?: 'default' | 'soft' | 'outline';
  padding?: 'md' | 'lg';
}

/** Región común (Gestalt): agrupa lo que va junto. */
export function Card({ tone = 'default', padding = 'md', style, ...rest }: CardProps) {
  const { c, scheme } = useTheme();
  return (
    <View
      style={[
        { borderRadius: radius.lg, padding: padding === 'md' ? space[4] : space[5] },
        tone === 'default' && [{ backgroundColor: c.surface }, elevation(1, scheme)],
        tone === 'soft' && { backgroundColor: c.accent },
        tone === 'outline' && { backgroundColor: c.surface, borderWidth: 2, borderColor: c.border },
        style,
      ]}
      {...rest}
    />
  );
}
