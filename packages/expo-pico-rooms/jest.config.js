const { defaults } = require('jest-config');
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react' } }] },
  testRegex: '__tests__/.*\\.test\\.tsx?$',
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  moduleNameMapper: {
    '^expo$': '<rootDir>/../__jest_stubs__/expo.js',
    '^expo-modules-core$': '<rootDir>/../__jest_stubs__/expo-modules-core.js',
  },
};
