// Reanimated 4 + worklets en Jest: usa los mocks oficiales de los paquetes.
// (El mock de Reanimated 4.5, SDK 57, no trae useReducedMotion.)
jest.mock('react-native-reanimated', () => ({ ...require('react-native-reanimated/mock'), useReducedMotion: () => false }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
