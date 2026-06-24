# expo-pico-account

PICO platform account, session, and identity APIs for Expo apps.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Status

- Maturity: alpha
- PICO Platform SDK linkage: extension seam. Bridge methods return `SERVICE_UNAVAILABLE` until the PICO Platform SDK AAR is present on the classpath (detected automatically; see [Runtime diagnostics](#runtime-diagnostics)).
- Platform: Android only (PICO is Android-only).
- Runtime target: PICO OS 6 (PICO 4, 4 Ultra, Swan), New Architecture.

## Install

```bash
yarn add expo-pico-core expo-pico-account
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

  const [profile, linkStatus] = await Promise.all([
    getUserProfile(),
    getAccountLinkStatus(),
  ]);
  return { profile, linkStatus, sdk: getAccountSdkVersion() };
}
```

## API

| Function                   | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `isAccountAvailable()`     | `true` on a PICO build with the Platform SDK linked.                    |
| `getAccountSdkVersion()`   | `'unavailable'` when the SDK isn't linked; otherwise the version string. |
| `getUserProfile()`         | Fetches the logged-in PICO user profile.                                |
| `getAccountLinkStatus()`   | Returns link status across external identity providers.                 |
| `login()` *(seam)*         | PICO OS owns the account session. No programmatic login path. Throws `notImplementedError`. |
| `getAccessToken()` *(seam)* | OAuth token exchange. Throws `notImplementedError` until wired.        |
| `logout()` *(seam)*        | Managed by PICO OS. Throws `notImplementedError`.                       |

Types: `PicoUserProfile`, `PicoLoginResult`, `PicoAccountLinkStatus`.

## Runtime diagnostics

Use [`expo-pico-core`](../expo-pico-core)'s Phase J probe to check whether the Account SDK is live at runtime:

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

if (isPlatformSdkPresent()) {
  const probe = await getPlatformSdkProbe();
  console.log('Account SDK live:', probe.account);
}
```

Or run the CLI before building: `npx expo-pico-doctor --fail-on-warning`. It surfaces the `identity.missing` warning when `platformService.picoAppId` is absent.

## Limitations

- Account bindings are an extension seam. When the PICO Platform SDK AAR ships as a public Maven artifact (or you drop it into `android/app/libs/`), account bridge methods start returning real data automatically. No plugin or JS API change needed.
- `login()` / `logout()` are deliberately `notImplementedError`: PICO OS owns the account session at device level. Apps receive an already-authenticated session on launch.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
