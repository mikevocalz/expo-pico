export type ValidationEnvironment =
  | 'non-pico'
  | 'emulator'
  | 'device'
  | 'multi-user'
  | 'provisioning';

export type PackageMaturity =
  | 'experimental'
  | 'alpha'
  | 'beta'
  | 'release candidate'
  | 'stable candidate';

export type PackageCatalogEntry = {
  id: string;
  packageName: string;
  maturity: PackageMaturity;
  validationEnvironments: ValidationEnvironment[];
  prereleaseReady: string;
  stableBlocker: string;
};

export const validationEnvironmentLabels: Record<ValidationEnvironment, string> = {
  'non-pico': 'non-PICO',
  emulator: 'emulator',
  device: 'device',
  'multi-user': '2 devices',
  provisioning: 'provisioning',
};

export const packageCatalog: PackageCatalogEntry[] = [
  {
    id: 'core',
    packageName: '@expo-pico/core',
    maturity: 'stable candidate',
    validationEnvironments: ['non-pico', 'emulator', 'device'],
    prereleaseReady: 'ready for next',
    stableBlocker: 'fresh-consumer install and published metadata hardening',
  },
  {
    id: 'spatial',
    packageName: '@expo-pico/spatial',
    maturity: 'beta',
    validationEnvironments: ['non-pico', 'emulator', 'device', 'provisioning'],
    prereleaseReady: 'ready with caveats',
    stableBlocker: 'async spatial seams remain intentionally deferred',
  },
  {
    id: 'account',
    packageName: '@expo-pico/account',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'native account bridge still stubbed',
  },
  {
    id: 'iap',
    packageName: '@expo-pico/iap',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'query bridge stubbed; purchase remains deferred',
  },
  {
    id: 'notifications',
    packageName: '@expo-pico/notifications',
    maturity: 'alpha',
    validationEnvironments: ['non-pico', 'emulator', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'token registration and delivery proof not complete',
  },
  {
    id: 'subscription',
    packageName: '@expo-pico/subscription',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'subscription bridge stubbed; subscribe/cancel remain deferred',
  },
  {
    id: 'rtc',
    packageName: '@expo-pico/rtc',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'multi-user audio proof and real RTC wiring',
  },
  {
    id: 'rooms',
    packageName: '@expo-pico/rooms',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'room lifecycle bridge stubbed; matchmaking deferred',
  },
  {
    id: 'storage',
    packageName: '@expo-pico/storage',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'cloud storage bridge stubbed; conflict proof missing',
  },
  {
    id: 'social',
    packageName: '@expo-pico/social',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'social graph bridge stubbed',
  },
  {
    id: 'achievements',
    packageName: '@expo-pico/achievements',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'achievement bridge stubbed',
  },
  {
    id: 'leaderboards',
    packageName: '@expo-pico/leaderboards',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'leaderboard bridge stubbed',
  },
];
