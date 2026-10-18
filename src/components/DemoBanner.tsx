import { View } from 'react-native';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { Button, KText } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { radius, space, useTheme } from '@/theme';

/**
 * Aviso discreto y permanente en modo demo (D54): deja claro que los datos no son de la persona
 * y ofrece el siguiente paso natural. No usa color de alerta: es información, no un problema.
 */
export function DemoBanner() {
  const { status, exitDemo } = useAuth();
  const { c } = useTheme();
  if (status !== 'demo') return null;
  return (
    <View
      accessibilityRole="summary"
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], marginTop: space[3], padding: space[3], borderRadius: radius.md, backgroundColor: c.accent }}
    >
      <Sparkles size={20} color={c.text} />
      <KText variant="small" style={{ flex: 1 }}>Estás explorando con datos de ejemplo</KText>
      <Button
        label="Crear mi cuenta"
        onPress={async () => {
          await exitDemo();
          router.push('/crear-cuenta');
        }}
      />
    </View>
  );
}
