// Metro: Storybook se incluye solo si EXPO_PUBLIC_STORYBOOK_ENABLED=true (npm run storybook).
// En la app normal y en el APK, withStorybook lo quita del bundle.
const { getDefaultConfig } = require('expo/metro-config');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');
const path = require('path');

const config = getDefaultConfig(__dirname);

module.exports = withStorybook(config, {
  configPath: path.resolve(__dirname, './.rnstorybook'),
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true',
});
