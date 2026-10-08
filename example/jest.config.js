/**
 * Unit tests for the example's pure layout logic. Node environment, no
 * renderer: components under test are called as plain functions.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^expo-modules-core$': '<rootDir>/../packages/__jest_stubs__/expo-modules-core.js',
    '^expo$': '<rootDir>/../packages/__jest_stubs__/expo.js',
    '^react-native$': '<rootDir>/../packages/__jest_stubs__/react-native.js',
  },
};
