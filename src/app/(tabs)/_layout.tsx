import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/ui';

/** Las redirecciones (sin sesión, onboarding pendiente) están centralizadas en AuthProvider. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} onRecord={() => router.push({ pathname: '/registro', params: { auto: '1' } })} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Hoy' }} />
      <Tabs.Screen name="calendario" options={{ title: 'Calendario' }} />
      <Tabs.Screen name="patrones" options={{ title: 'Patrones' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
