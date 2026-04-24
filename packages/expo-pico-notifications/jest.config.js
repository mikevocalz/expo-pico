const { defaults } = require('jest-config');
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react', types: ['jest'], typeRoots: ['../../node_modules/@types'] } }] },
  testRegex: '__tests__/.*\\.test\\.tsx?$',
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],
};
