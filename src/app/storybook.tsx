import { router } from 'expo-router';
import { Button, EmptyState } from '@/components/ui';
import { Screen } from '@/components/Screen';

const enabled = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

/**
 * Storybook en el dispositivo. Solo existe en el bundle cuando se arranca con `npm run storybook:app`;
 * en la app normal esta ruta explica cómo activarlo y ofrece el catálogo integrado.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StorybookUI = enabled ? require('../../.rnstorybook').default : null;

export default function StorybookRoute() {
  if (StorybookUI) return <StorybookUI />;
  return (
    <Screen title="Storybook">
      <EmptyState
        kind="no-data"
        title="Storybook está apagado"
        description="Arranca la app con «npm run storybook:app» para verlo aquí. Mientras tanto, el catálogo integrado muestra los mismos componentes."
        actions={<Button fullWidth label="Abrir el catálogo" onPress={() => router.replace('/design-system')} />}
      />
    </Screen>
  );
}
