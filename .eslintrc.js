// Root ESLint config. Packages previously each required
// `expo-module-scripts/eslintrc.base.js`; that package is no longer a
// dependency, so config lives here and cascades down.
module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  ignorePatterns: [
    '**/node_modules/**',
    '**/build/**',
    '**/nitrogen/generated/**',
    '**/plugin/build/**',
    '**/cli/build/**',
    'example/android/**',
    'example/ios/**',
    '.vendor/**',
    'vendor/**',
  ],
  overrides: [
    {
      // app-kit probes optional peer SDKs by reflection, so `any` is the
      // honest type at that boundary; the typed surface is re-established
      // immediately after. Everywhere else `any` stays an error.
      files: ['packages/expo-pico-app-kit/src/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    {
      files: ['**/__tests__/**', '*.test.ts', '*.test.tsx'],
      env: { jest: true },
    },
  ],
};
