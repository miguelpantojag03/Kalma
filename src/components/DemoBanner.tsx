import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { KText } from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthProvider';
import { radius, space, touch, useTheme } from '@/theme';

/**
 * Aviso discreto y permanente en modo demo (D54): deja claro que los datos no son de la persona
 * y ofrece el siguiente paso natural. No usa color de alerta: es información, no un problema.
 * Una sola línea con un enlace (D92): antes eran 3 líneas y un botón primario en cada pestaña,
 * que competía con la acción principal de la pantalla.
 */
export function DemoBanner() {
  const { status, exitDemo } = useAuth();
  const { c } = useTheme();
  if (status !== 'demo') return null;
  return (
    <View
      accessibilityRole="summary"
      style={{ flexDirection: 'row', alignItems: 'center', gap: space[2], marginTop: space[3], paddingLeft: space[3], borderRadius: radius.full, backgroundColor: c.accent, minHeight: touch.min }}
    >
      <Sparkles size={18} color={c.text} />
      <KText variant="smallStrong" style={{ flex: 1 }} numberOfLines={1}>Datos de ejemplo</KText>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Crear mi cuenta"
        onPress={async () => {
          await exitDemo();
          router.push('/crear-cuenta');
        }}
        hitSlop={4}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: touch.min, paddingHorizontal: space[3], borderRadius: radius.full, opacity: pressed ? 0.6 : 1 })}
      >
        <KText variant="smallStrong" tone="default" style={{ textDecorationLine: 'underline' }}>Crear mi cuenta</KText>
        <ChevronRight size={18} color={c.text} />
      </Pressable>
    </View>
  );
}
