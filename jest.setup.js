// Reanimated 4 + worklets en Jest: usa los mocks oficiales de los paquetes.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
// Gesture Handler 3 intenta conectarse al hilo de UI al importarse; en Jest se usa su mock oficial.
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () => ({ ...jest.requireActual('react-native-worklets'), getUIRuntimeHolder: () => ({}) }));
