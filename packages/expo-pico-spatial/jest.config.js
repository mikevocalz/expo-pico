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
    '^react-native
    '^react-native-nitro-modules$': '<rootDir>/../__jest_stubs__/react-native-nitro-modules.js',
  },
};
: '<rootDir>/../__jest_stubs__/react-native.js',
    '^expo-modules-core
    '^react-native-nitro-modules$': '<rootDir>/../__jest_stubs__/react-native-nitro-modules.js',
  },
};
: '<rootDir>/../__jest_stubs__/expo-modules-core.js',
    '^react-native-nitro-modules$': '<rootDir>/../__jest_stubs__/react-native-nitro-modules.js',
  },
};
