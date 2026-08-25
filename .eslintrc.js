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
      files: ['*.ts', '*.tsx'],
      rules: {
        // Reflection-based SDK probing legitimately needs `any` at the
        // boundary; the typed surface is re-established immediately after.
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
    {
      files: ['**/__tests__/**', '*.test.ts', '*.test.tsx'],
      env: { jest: true },
    },
  ],
};
