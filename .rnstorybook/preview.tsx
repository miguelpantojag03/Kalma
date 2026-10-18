import type { Preview } from '@storybook/react-native';
import { ScrollView } from 'react-native';
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { ThemeProvider, useTheme } from '../src/theme';

/** Fondo y margen del tema activo para cada historia. */
function Canvas({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      {children}
    </ScrollView>
  );
}

function Fonts({ children }: { children: React.ReactNode }) {
  const [loaded, error] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Inter_400Regular, Inter_500Medium, Inter_700Bold });
  if (!loaded && !error) return null;
  return <>{children}</>;
}

const preview: Preview = {
  // Control "Tema" en el panel de controles: claro / oscuro para revisar contraste en ambos.
  argTypes: {
    theme: { control: 'select', options: ['light', 'dark'] },
  },
  decorators: [
    (Story, ctx) => (
      <Fonts>
        <ThemeProvider forceScheme={(ctx.args as { theme?: 'light' | 'dark' }).theme ?? 'light'}>
          <Canvas>
            <Story />
          </Canvas>
        </ThemeProvider>
      </Fonts>
    ),
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i } },
  },
};

export default preview;
