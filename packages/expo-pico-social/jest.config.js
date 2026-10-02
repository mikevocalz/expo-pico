module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^expo-modules-core    '^react-native$': '<rootDir>/../__jest_stubs__/react-native.js',
  },
};
: '<rootDir>/../__jest_stubs__/expo-modules-core.js',
    '^react-native$': '<rootDir>/../__jest_stubs__/react-native.js',
  },
};
