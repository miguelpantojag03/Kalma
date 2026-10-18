import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { PATTERN_LEVEL_LABEL, type PatternLevel } from '@/lib/types';
import { elevation, radius, space, useTheme } from '@/theme';
import { KText } from './KText';

const DOTS: Record<PatternLevel, number> = { possible: 1, probable: 2, strong: 3 };

/** Nivel de confianza con palabra + puntos (1/2/3), nunca solo color. */
export function PatternLevelBadge({ level }: { level: PatternLevel }) {
  const { c } = useTheme();
  const strong = level === 'strong';
  const fg = strong ? c.onPrimary : c.text;
  return (
    <View
      accessible
      accessibilityLabel={`Confianza: ${PATTERN_LEVEL_LABEL[level]}`}
      style={[styles.badge, { backgroundColor: strong ? c.primaryStrong : c.accent }]}
    >
      <View style={styles.dots}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.dot, { borderColor: fg, backgroundColor: i <= DOTS[level] ? fg : 'transparent', opacity: i <= DOTS[level] ? 1 : 0.5 }]}
          />
        ))}
      </View>
      <KText variant="smallStrong" style={{ color: fg }}>{PATTERN_LEVEL_LABEL[level]}</KText>
    </View>
  );
}

export interface PatternCardProps {
  level: PatternLevel;
  /** Con números y sin causalidad: "El 70 % de tus dolores de cabeza llegaron después de…". */
  statement: string;
  /** "14 de 20 episodios · 45 días" */
  evidence: string;
  isNew?: boolean;
  dismissed?: boolean;
  onPress?: () => void;
}

export function PatternCard({ level, statement, evidence, isNew, dismissed, onPress }: PatternCardProps) {
  const { c, scheme } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${isNew ? 'Nuevo. ' : ''}Confianza ${PATTERN_LEVEL_LABEL[level]}. ${statement} ${evidence}.${dismissed ? ' Marcado como no útil.' : ''}`}
      accessibilityHint={onPress ? 'Abre el detalle con los números y los días' : undefined}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.surface,
          borderColor: isNew && !dismissed ? c.primary : 'transparent',
          opacity: dismissed ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
        !dismissed && elevation(1, scheme),
      ]}
    >
      <View style={styles.top} importantForAccessibility="no-hide-descendants">
        <PatternLevelBadge level={level} />
        {isNew && !dismissed && (
          <View style={styles.row}>
            <Sparkles size={16} color={c.primaryStrong} />
            <KText variant="smallStrong" tone="brand">Nuevo</KText>
          </View>
        )}
        {dismissed && <KText variant="small" tone="muted">Marcado como no útil</KText>}
      </View>
      <KText variant="subheading" importantForAccessibility="no">{statement}</KText>
      <View style={styles.top} importantForAccessibility="no-hide-descendants">
        <KText variant="small" tone="muted" style={{ flex: 1 }}>{evidence}</KText>
        {onPress && (
          <View style={styles.row}>
            <KText variant="smallStrong" tone="brand">Ver detalle</KText>
            <ChevronRight size={20} color={c.primaryStrong} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 2, padding: space[4], gap: space[3] },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space[2], borderRadius: radius.full, paddingHorizontal: space[3], paddingVertical: space[1] },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
});
