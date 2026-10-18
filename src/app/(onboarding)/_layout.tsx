import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

/** Onboarding de una cuenta nueva (consentimiento, intereses, medicamentos, recordatorio). */
export default function OnboardingLayout() {
  const { c } = useTheme();
  return <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: c.bg } }} />;
}
