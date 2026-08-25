module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/../__jest_stubs__/react-native.js',
    '^react-native-nitro-modules$': '<rootDir>/../__jest_stubs__/react-native-nitro-modules.js',
  },
};
