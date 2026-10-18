import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Button, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';

/** Enlace roto o pantalla que ya no existe (p. ej., una notificación vieja): salida clara a Hoy. */
export default function NotFound() {
  const { c } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 24 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          kind="no-data"
          title="No encontré esta pantalla"
          description="Puede que el enlace sea viejo. Tus registros siguen donde los dejaste."
          actions={<Button fullWidth label="Ir a Hoy" onPress={() => router.replace('/')} />}
        />
      </View>
    </SafeAreaView>
  );
}
