# expo-pico-account

[![live](https://img.shields.io/badge/PPS_1.0.x-live-1F6F3F?style=flat-square)](../../README.md#packages)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](../../docs/FAQ.md)

PICO platform account, session, and identity APIs for Expo apps.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Other packages depend on this one

PPS resolves account-scoped data from the signed-in session, so these packages
need a connected PICO account at runtime even though none of them import this
package:

| Package                    | Why                                                     |
| -------------------------- | ------------------------------------------------------- |
| `@expo-pico/iap`           | purchases resolve against the signed-in account         |
| `@expo-pico/subscription`  | entitlements are per-account                            |
| `@expo-pico/achievements`  | progress is written against the signed-in user          |
| `@expo-pico/leaderboards`  | entries are written against the signed-in user          |
| `@expo-pico/social`        | friends and presence are per-account                    |
| `@expo-pico/notifications` | push registration binds the token to the signed-in user |

Call `login()` once at boot before any of them. Without it those packages return
empty results or `SERVICE_UNAVAILABLE` rather than throwing.

## Status

- Maturity: alpha
- PICO Platform Service SDK (PPS) linkage: live on `picoDebug` builds. `PicoSignInClient` from `com.pico.pps:platform-service-auth:1.0.0` is pulled automatically from the public Bytedance Maven repo by `expo-pico-core`'s plugin, so no AAR drop is needed. Bridge methods only return `SERVICE_UNAVAILABLE` on the `mobile` flavor, on non-PICO hardware, or if Gradle was offline at prebuild time (detected automatically; see [Runtime diagnostics](#runtime-diagnostics)).
- Platform: Android only (PICO is Android-only).
- Runtime target: PICO OS 6 (PICO 4, 4 Ultra, Swan), New Architecture.

## Install

```bash
yarn add @expo-pico/core @expo-pico/account react-native-nitro-modules
```

`expo-pico-core` is a peer dependency. It must be listed before `expo-pico-account` in your `app.config.ts` plugins array so the flavor manifest, launcher categories, and BuildConfig fields land first.

## Configure

```ts
// app.config.ts
export default {
  plugins: [
    [
      '@expo-pico/core',
      {
        // Account APIs need platform identity to initialize; populate
        // from a PICO developer console app, not checked-in secrets.
        platformService: {
          picoAppId: process.env.PICO_PLATFORM_APP_ID,
          picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
        },
        buildVariant: 'pico',
        xrMode: 'pico-os5',
        appType: 'vr',
      },
    ],
    '@expo-pico/account',
  ],
};
```

Then run `npx expo prebuild --clean` to regenerate the native projects.

## Usage

```ts
import {
  isAccountAvailable,
  getAccountSdkVersion,
  getUserProfile,
  getAccountLinkStatus,
} from '@expo-pico/account';
import { hasPlatformIdentity } from '@expo-pico/core';

async function loadUser() {
  // Guard against non-PICO builds and missing identity.
  if (!hasPlatformIdentity() || !isAccountAvailable()) {
    return null;
  }

  const [profile, linkStatus] = await Promise.all([getUserProfile(), getAccountLinkStatus()]);
  return { profile, linkStatus, sdk: getAccountSdkVersion() };
}
```

## API

| Function                    | Description                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| `isAccountAvailable()`      | `true` on a `picoDebug` build with the PPS auth client resolved.                                      |
| `getAccountSdkVersion()`    | `'unavailable'` on a `mobile`-flavor build or when PPS wasn't resolved; otherwise the version string. |
| `getUserProfile()`          | Fetches the logged-in PICO user profile.                                                              |
| `getAccountLinkStatus()`    | Returns link status across external identity providers.                                               |
| `login()` _(seam)_          | PICO OS owns the account session. No programmatic login path. Throws `notImplementedError`.           |
| `getAccessToken()` _(seam)_ | OAuth token exchange. Throws `notImplementedError` until wired.                                       |
| `logout()` _(seam)_         | Managed by PICO OS. Throws `notImplementedError`.                                                     |

Types: `PicoUserProfile`, `PicoLoginResult`, `PicoAccountLinkStatus`.

## Runtime diagnostics

Use [`expo-pico-core`](../expo-pico-core)'s reflection probe to check whether the Account SDK is live at runtime:

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

if (isPlatformSdkPresent()) {
  const probe = await getPlatformSdkProbe();
  console.log('Account SDK live:', probe.account);
}
```

Or run the CLI before building: `npx expo-pico-doctor --fail-on-warning`. It surfaces the `identity.missing` warning when `platformService.picoAppId` is absent.

## Native artifacts

This package needs `com.pico.pps:platform-service-auth` on the Android classpath.

**It does not declare it.** `@expo-pico/core` declares every
`com.pico.pps` coordinate once, in the app module, and this package
reaches it through `implementation project(':expo-pico-core')`. So
installing it next to other `@expo-pico/*` packages never produces a
second declaration of the same artifact.

See [docs/PPS-ARTIFACTS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PPS-ARTIFACTS.md)
for the full artifact list and the two cases that can still duplicate
(a vendored AAR shadowing the Maven copy, and version skew).

## Limitations

- Account bindings ride the modern PPS Maven artifact (`com.pico.pps:platform-service-auth:1.0.0`), which `withPicoGradle` resolves from public Maven on `picoDebug` builds. No AAR drop is required; bridge methods return real data automatically on PICO hardware.
- `login()` / `logout()` are deliberately `notImplementedError`: PICO OS owns the account session at device level. Apps receive an already-authenticated session on launch.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
