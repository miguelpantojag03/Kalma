import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { Button, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Pantalla de error de último recurso (ErrorBoundary de Expo Router). Nunca muestra el error
 * técnico: dice qué pasó en palabras simples, que lo guardado sigue a salvo y ofrece una salida.
 * El detalle solo va a la consola en desarrollo.
 */
export function AppError({ error, retry }: ErrorBoundaryProps) {
  const { c } = useTheme();
  if (__DEV__) console.error(error);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg, padding: 24 }}>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          kind="error"
          title="Algo no salió bien"
          description="Tus registros están a salvo. Intenta de nuevo; si sigue pasando, cierra y abre Kalma."
          actions={
            <>
              <Button fullWidth label="Intentar de nuevo" onPress={retry} />
              <Button fullWidth variant="ghost" label="Ir a Hoy" onPress={() => router.replace('/')} />
            </>
          }
        />
      </View>
    </SafeAreaView>
  );
}
