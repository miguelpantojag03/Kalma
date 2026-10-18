// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/**', 'supabase/functions/**', '.rnstorybook/storybook.requires.ts'],
  },
  // Configuración de Jest
  { files: ['jest.setup.js'], languageOptions: { globals: { jest: 'readonly' } } },
  // Scripts de verificación: sus dependencias (puppeteer-core) se instalan solo al usarlos
  { files: ['scripts/**'], rules: { 'import/no-unresolved': 'off' } },
]);
