import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, ThemeProvider as NavThemeProvider, DarkTheme, DefaultTheme, type Theme as NavTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { AppLock } from '@/components/AppLock';
import { ToastHost } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
import { useDeviceSettings } from '@/lib/deviceSettings';
import { expiredIds } from '@/lib/experiments';
import { cancelDailyCheckin, cancelExperimentReminder, scheduleDailyCheckin, scheduleExperimentReminder, useNotificationRouting } from '@/lib/notifications';
import { useKalma } from '@/lib/store';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Si una pantalla falla, se ve un mensaje amable con "Intentar de nuevo" (nunca el error técnico).
export { AppError as ErrorBoundary } from '@/components/AppError';

export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_700Bold });
  // Si las fuentes fallan, seguimos con las del sistema: la app nunca se queda en la splash.
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <Navigator />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const { c, scheme } = useTheme();
  const { status } = useAuth();
  const hydrated = useKalma((s) => s.hydrated);
  const reminderTime = useKalma((s) => s.profile.reminderTime);
  const name = useKalma((s) => s.profile.name);
  const onboarded = useKalma((s) => s.profile.onboarded);
  const experiments = useKalma((s) => s.experiments);
  const endExperiment = useKalma((s) => s.endExperiment);
  const checkinReminder = useDeviceSettings((s) => s.checkinReminder);

  // La splash se mantiene hasta saber a qué espacio entrar y tener su caché cargada:
  // nunca se ve un parpadeo de la bienvenida ni un "día en blanco" falso (D28, D56).
  const ready = status !== 'loading' && hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useNotificationRouting();
  // Mantiene programado el check-in diario a la hora elegida (si hay permiso; si no, no hace nada).
  // Se puede apagar en Perfil › Recordatorios.
  useEffect(() => {
    if (!onboarded || (status !== 'signedIn' && status !== 'demo')) return;
    if (checkinReminder) void scheduleDailyCheckin(reminderTime, name || undefined);
    else void cancelDailyCheckin();
  }, [reminderTime, name, onboarded, status, checkinReminder]);

  // El recordatorio del experimento activo se reprograma al entrar (otro celular, otra sesión o
  // nueva hora del check-in). Usa un identificador fijo, así que no se duplica.
  const active = experiments.find((x) => x.status === 'active');
  const activeId = active?.id;
  const activeTitle = active?.title;
  useEffect(() => {
    if (!hydrated || !activeId || !activeTitle || (status !== 'signedIn' && status !== 'demo')) return;
    void scheduleExperimentReminder(activeId, activeTitle, reminderTime);
  }, [hydrated, status, activeId, activeTitle, reminderTime]);

  // Los experimentos cuyo periodo ya pasó se cierran solos (y dejan de recordar) al abrir la app.
  useEffect(() => {
    if (!hydrated) return;
    for (const id of expiredIds(experiments)) {
      endExperiment(id, 'finished');
      void cancelExperimentReminder(id);
    }
  }, [hydrated, experiments, endExperiment]);

  // El tema de navegación usa los mismos tokens (fondos, encabezados y transiciones sin destellos).
  const navTheme = useMemo<NavTheme>(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: c.primaryStrong, background: c.bg, card: c.surface, text: c.text, border: c.border, notification: c.primaryStrong },
    };
  }, [c, scheme]);

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          headerTitleStyle: { fontFamily: 'Nunito_700Bold' },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'fade', gestureEnabled: false }} />
        {/* Registro y check-in como modales: se cierran con el gesto de iOS o el botón atrás de Android */}
        <Stack.Screen name="registro" options={{ presentation: 'modal' }} />
        <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
        <Stack.Screen name="volvi-del-medico" options={{ presentation: 'modal' }} />
        {/* Emergencia: pantalla completa, no se descarta con un gesto por accidente */}
        <Stack.Screen name="emergencia" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="design-system" options={{ headerShown: true, title: 'Design system' }} />
      </Stack>
      <ToastHost />
      <AppLock />
    </NavThemeProvider>
  );
}
