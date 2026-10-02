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
    '^expo-modules-core    '^react-native$': '<rootDir>/../__jest_stubs__/react-native.js',
  },
};
: '<rootDir>/../__jest_stubs__/expo-modules-core.js',
    '^react-native$': '<rootDir>/../__jest_stubs__/react-native.js',
  },
};
