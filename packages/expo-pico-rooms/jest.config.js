const { defaults } = require('jest-config');
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      { tsconfig: { jsx: 'react', types: ['jest'], typeRoots: ['../../node_modules/@types'] } },
    ],
  },
  testRegex: '__tests__/.*\\.test\\.tsx?$',
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
  moduleNameMapper: {
    '^react-native-nitro-modules$': '<rootDir>/../__jest_stubs__/react-native-nitro-modules.js',
  },
};
