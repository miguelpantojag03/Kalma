import { Redirect } from 'expo-router';
import { DesignSystemScreen } from '@/features/design-system/DesignSystemScreen';
import { useAuth } from '@/lib/auth/AuthProvider';

/** Catálogo del design system: herramienta para presentar el proyecto, solo en la demo (o en desarrollo). */
export default function DesignSystemRoute() {
  const { status } = useAuth();
  if (status !== 'demo' && !__DEV__) return <Redirect href="/" />;
  return <DesignSystemScreen />;
}
