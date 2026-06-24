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
    stableBlocker: 'on-device verification of PicoSignInClient.getUserInfo round-trip',
  },
  {
    id: 'iap',
    packageName: '@expo-pico/iap',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'on-device verification of IAP query/purchase round-trip with real product catalog',
  },
  {
    id: 'notifications',
    packageName: '@expo-pico/notifications',
    maturity: 'alpha',
    validationEnvironments: ['non-pico', 'emulator', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'on-device verification of push token + delivery proof',
  },
  {
    id: 'subscription',
    packageName: '@expo-pico/subscription',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'on-device verification of subscribe/cancel round-trip',
  },
  {
    id: 'rtc',
    packageName: '@expo-pico/rtc',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'PPS 1.0.x removed RTC — use @fishjam-cloud/react-native-webrtc',
  },
  {
    id: 'rooms',
    packageName: '@expo-pico/rooms',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'PPS 1.0.x removed dedicated rooms — use Fishjam/Colyseus or wait for next-gen PPS',
  },
  {
    id: 'storage',
    packageName: '@expo-pico/storage',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'PPS 1.0.x removed cloud storage — use own backend keyed off openUid, or expo-secure-store',
  },
  {
    id: 'social',
    packageName: '@expo-pico/social',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'on-device verification of friends list + presence',
  },
  {
    id: 'achievements',
    packageName: '@expo-pico/achievements',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'on-device verification of unlock + progress round-trip',
  },
  {
    id: 'leaderboards',
    packageName: '@expo-pico/leaderboards',
    maturity: 'experimental',
    validationEnvironments: ['non-pico', 'device', 'multi-user', 'provisioning'],
    prereleaseReady: 'alpha only',
    stableBlocker: 'on-device verification of submit + query top-N',
  },
];
