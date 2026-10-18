import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { elevation, space, useTheme } from '@/theme';
import { KText } from './KText';
import { Mascot, type MascotMood } from './Mascot';

export type EmptyStateKind = 'first-use' | 'no-data' | 'locked' | 'error' | 'offline';

export interface EmptyStateProps {
  kind?: EmptyStateKind;
  title: string;
  description?: string;
  /** Acciones (normalmente <Button fullWidth />). */
  actions?: ReactNode;
  /** Reemplaza la ilustración (p. ej. un ProgressRing). */
  visual?: ReactNode;
}

const MOOD: Record<EmptyStateKind, MascotMood> = {
  'first-use': 'happy',
  'no-data': 'idle',
  locked: 'sleepy',
  error: 'thinking',
  offline: 'sleepy',
};

/** Un estado vacío nunca es un callejón sin salida: dice qué pasa y qué hacer (Nielsen #1 y #9). */
export function EmptyState({ kind = 'no-data', title, description, actions, visual }: EmptyStateProps) {
  const { c, scheme } = useTheme();
  return (
    <View
      style={styles.wrap}
      accessibilityLiveRegion={kind === 'error' || kind === 'offline' ? 'polite' : 'none'}
    >
      <View>
        {visual ?? <Mascot mood={MOOD[kind]} size={120} />}
        {kind === 'locked' && !visual && (
          <View style={[styles.lock, { backgroundColor: c.surface }, elevation(2, scheme)]}>
            <Lock size={20} color={c.primaryStrong} />
          </View>
        )}
      </View>
      <KText variant="heading" center>{title}</KText>
      {!!description && (
        <KText tone="muted" center style={{ maxWidth: 300 }}>{description}</KText>
      )}
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space[4], paddingHorizontal: space[5], paddingVertical: space[6] },
  lock: { position: 'absolute', right: -4, bottom: -4, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actions: { alignSelf: 'stretch', gap: space[2], marginTop: space[2] },
});
