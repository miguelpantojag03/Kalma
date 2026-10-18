import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import {
  Activity, Circle, CloudSun, Coffee, Droplet, Footprints, GlassWater, Moon, Pencil, Pill,
  StickyNote, Trash, UtensilsCrossed, Wind, type LucideIcon,
} from 'lucide-react-native';
import { EVENT_TYPE_LABEL, LOW_CONFIDENCE, type EventType } from '@/lib/types';
import { elevation, radius, space, touch, useTheme } from '@/theme';
import { IntensityBadge } from './Intensity';
import { KText } from './KText';

export const EVENT_ICON: Record<EventType, LucideIcon> = {
  symptom: Activity,
  food: UtensilsCrossed,
  drink: Coffee,
  medication: Pill,
  sleep: Moon,
  activity: Footprints,
  mood: CloudSun,
  stress: Wind,
  menstrual: Droplet,
  bowel: Circle,
  water: GlassWater,
  note: StickyNote,
};

export interface EventCardProps {
  type: EventType;
  title: string;
  /** "Tarde · aprox.", "2 tazas", "Lado izquierdo"… */
  detail?: string;
  time?: string;
  intensity?: number;
  /** 0–1. Por debajo de LOW_CONFIDENCE se marca "¿Es correcto?". */
  confidence?: number;
  /** Fragmento de lo que dijo la persona que respalda el dato (transparencia de la IA). */
  sourceText?: string;
  edited?: boolean;
  selected?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onPress?: () => void;
  children?: ReactNode;
  style?: ViewStyle;
}

export function EventCard({
  type, title, detail, time, intensity, confidence, sourceText, edited, selected,
  onEdit, onRemove, onPress, children, style,
}: EventCardProps) {
  const { c, scheme } = useTheme();
  const Icon = EVENT_ICON[type];
  const low = confidence !== undefined && confidence < LOW_CONFIDENCE && !edited;
  const meta = [time, detail].filter(Boolean).join(' · ');
  const a11ySummary = [
    `${EVENT_TYPE_LABEL[type]}: ${title}`,
    meta,
    intensity !== undefined ? `intensidad ${intensity} de 10` : null,
    low ? 'Kalma no está segura, revisa si es correcto' : null,
    edited ? 'editado por ti' : null,
  ]
    .filter(Boolean)
    .join('. ');

  const body = (
    <View style={styles.head}>
      <View style={[styles.icon, { backgroundColor: type === 'symptom' ? c.intensity[3] : c.accent }]}>
        <Icon size={22} strokeWidth={2.25} color={type === 'symptom' ? c.onIntensity : c.text} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <KText variant="caption" tone="muted" style={styles.kicker}>
          {EVENT_TYPE_LABEL[type].toUpperCase()}
        </KText>
        <KText variant="subheading">{title}</KText>
        {!!meta && <KText variant="small" tone="muted" style={{ marginTop: 2 }}>{meta}</KText>}
      </View>
      {intensity !== undefined && <IntensityBadge value={intensity} />}
    </View>
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: selected ? c.primaryStrong : low ? c.warning : 'transparent' },
        elevation(selected ? 2 : 1, scheme),
        style,
      ]}
    >
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11ySummary}
          accessibilityHint="Toca para corregir o quitar"
          accessibilityState={{ selected: !!selected }}
          onPress={onPress}
        >
          {body}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={a11ySummary}>
          {body}
        </View>
      )}

      {!!sourceText && (
        <View style={[styles.quote, { backgroundColor: c.surfaceMuted }]} accessible accessibilityLabel={`Lo que dijiste: ${sourceText}`}>
          <KText variant="small" tone="muted" style={{ fontStyle: 'italic' }}>“{sourceText}”</KText>
        </View>
      )}

      {children}

      {(low || edited || onEdit || onRemove) && (
        <View style={styles.footer}>
          <View style={{ flex: 1 }}>
            {low && (
              <View style={styles.flag} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <View style={[styles.dot, { backgroundColor: c.warning }]} />
                <KText variant="smallStrong" tone="warning">¿Es correcto?</KText>
              </View>
            )}
            {edited && (
              <View style={styles.flag} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Pencil size={14} color={c.muted} />
                <KText variant="small" tone="muted">Editado por ti</KText>
              </View>
            )}
          </View>
          {onEdit && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar ${title}`}
              onPress={onEdit}
              style={({ pressed }) => [styles.action, { backgroundColor: pressed ? c.surfaceMuted : 'transparent' }]}
            >
              <Pencil size={18} color={c.text} />
              <KText variant="smallStrong">Editar</KText>
            </Pressable>
          )}
          {onRemove && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${title}`}
              onPress={onRemove}
              style={({ pressed }) => [styles.iconAction, { backgroundColor: pressed ? c.surfaceMuted : 'transparent' }]}
            >
              <Trash size={20} color={c.muted} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 2, padding: space[4], gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  kicker: { letterSpacing: 0.6 },
  quote: { borderRadius: radius.sm, paddingHorizontal: space[3], paddingVertical: space[2] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  flag: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  action: { flexDirection: 'row', alignItems: 'center', gap: space[1], minHeight: touch.min, paddingHorizontal: space[3], borderRadius: radius.full },
  iconAction: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
});
