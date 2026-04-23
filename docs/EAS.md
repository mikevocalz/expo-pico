# EAS Build + Submit — PICO integration

This guide covers building and submitting PICO-targeted Expo apps through [EAS Build](https://docs.expo.dev/build/introduction/) and the PICO Developer Platform. It is opinionated toward the `expo-pico-*` plugin family, but the EAS setup itself is standard — nothing here overrides Expo's own recommendations.

Every item below is testable locally with `eas build --local` before running it on the hosted build service.

## Prerequisites

- `eas-cli` installed (`yarn global add eas-cli` or `npx eas-cli`).
- An Expo / EAS account. PICO Developer Platform credentials are separate (see §4).
- Your project already builds via `npx expo prebuild --clean` + the `expo-pico-core` plugin (run `npx expo-pico-doctor --fail-on-warning` first).

## 1. `eas.json` profiles

PICO apps want at least two build variants per environment: a `mobile` variant for development-on-phone and a `pico` variant for headset. Most consumers end up with four profiles: dev-mobile, dev-pico, prod-mobile, prod-pico. An example config (also shipped at [`example/eas.json`](../example/eas.json)) looks like:

```json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "base": {
      "distribution": "internal",
      "android": {
        "autoIncrement": true,
        "image": "latest"
      }
    },
    "dev-mobile": {
      "extends": "base",
      "developmentClient": true,
      "android": { "gradleCommand": ":app:assembleMobileDebug" }
    },
    "dev-pico": {
      "extends": "base",
      "developmentClient": true,
      "android": { "gradleCommand": ":app:assemblePicoDebug" }
    },
    "preview-pico": {
      "extends": "base",
      "android": { "gradleCommand": ":app:assemblePicoRelease" }
    },
    "production-pico": {
      "extends": "base",
      "distribution": "store",
      "android": {
        "gradleCommand": ":app:bundlePicoRelease",
        "buildType": "app-bundle"
      }
    },
    "production-mobile": {
      "extends": "base",
      "distribution": "store",
      "android": {
        "gradleCommand": ":app:bundleMobileRelease",
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production-mobile": { "android": { "track": "internal" } }
  }
}
```

Key points:

- The `gradleCommand` entries pin EAS to the exact flavor-qualified task. `:app:assembleDebug` would build both `mobileDebug` and `picoDebug` in the same job — wasteful and confusing in logs.
- `bundlePicoRelease` produces an AAB. PICO accepts both APK and AAB; AAB is preferred for size.
- `distribution: "store"` is correct even though the "store" is PICO's, not Google's — it just tells EAS this build is intended for production distribution.

## 2. Secrets

Plugin options that come from env vars (`PICO_PLATFORM_APP_ID`, `PICO_PLATFORM_APP_KEY`, IAP merchant/pay keys, their `_FOREIGN` siblings) need to be available at prebuild + Gradle time. Two ways:

**EAS Secrets (recommended).**

```bash
eas secret:create --name PICO_PLATFORM_APP_ID --value xxxxxx --type string
eas secret:create --name PICO_PLATFORM_APP_KEY --value xxxxxx --type string
eas secret:create --name PICO_MERCHANT_ID --value xxxxxx --type string
eas secret:create --name PICO_PAY_KEY --value xxxxxx --type string
```

EAS injects these as env vars into the build pipeline. Your `app.config.ts` reads them via `process.env.PICO_PLATFORM_APP_ID` etc. (see the example app's `app.config.ts` for the exact pattern).

**`.env` files (local / bare-EAS).**

Keep a `.env.production` that the build reads. Never commit this file. Use EAS Secrets for hosted builds — `.env` files are only practical for `eas build --local`.

If a secret is missing at build time, `expo-pico-core`'s Phase E diagnostics emit `identity.missing` warnings; the build still succeeds but Platform SDK calls return `SERVICE_UNAVAILABLE` at runtime. Run the doctor first to verify:

```bash
npx expo-pico-doctor --fail-on-warning
```

## 3. Signing

PICO accepts standard Android signing keystores. EAS handles credential generation on first build:

```bash
eas credentials
```

- Generate a new Android Keystore.
- Choose different credentials per profile only if you need separate keystores for mobile vs pico (rare — typically one keystore is enough).
- **Back up the keystore.** Losing it means you can't update already-published apps on the PICO Store.

For a production app shared across multiple developers, store the keystore + keystore password in a shared secret manager (1Password, AWS Secrets Manager) and import into EAS via `eas credentials --platform android`.

## 4. PICO Developer Platform

EAS builds the APK / AAB; PICO distributes it. You need separate PICO developer credentials:

1. Register at [developer.picoxr.com](https://developer.picoxr.com/).
2. Create an app to get `PICO_PLATFORM_APP_ID` + `PICO_PLATFORM_APP_KEY`. Add both as EAS Secrets (§2).
3. If you need IAP, set up merchant account and billing keys in the PICO Developer Console.
4. For the Global region, create a second app record and populate `platformService.foreign.*` fields in `app.config.ts`.

### Submission

There is **no `eas submit` integration with the PICO Store today** (this may change — track the EAS docs). Submit manually:

1. Build: `eas build --profile production-pico`.
2. Download the resulting AAB from EAS.
3. Upload via the PICO Developer Console → app → release → upload build.
4. Attach release notes, screenshots, etc.
5. Submit for review.

## 5. Verifying the build

After EAS produces the APK / AAB, confirm the merged manifest carries the expected PICO plumbing before submission:

```bash
# Inspect the merged manifest
aapt dump xmltree path/to/app.apk AndroidManifest.xml > /tmp/merged-manifest.xml

# Check Phase A launcher contract
grep -E 'pvr\.app\.type|IMMERSIVE_HMD|com\.pico\.intent\.category\.VR' /tmp/merged-manifest.xml

# Check Phase B Platform SDK identity
grep -E 'UnityAuthInterface|PicoSDKBrowser' /tmp/merged-manifest.xml

# Check Phase E OpenXR loader + ABI
grep libopenxr_loader.so /tmp/merged-manifest.xml
aapt dump badging path/to/app.apk | grep native-code
```

If any of these are missing and you expected them, rerun `npx expo prebuild --clean` + `npx expo-pico-doctor` before rebuilding.

## 6. CI recipes

### GitHub Actions — build on tag

```yaml
name: EAS Build

on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: yarn }
      - run: yarn install --frozen-lockfile

      - name: Verify plugin config
        run: npx expo-pico-doctor --project example --fail-on-warning

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - run: eas build --profile production-pico --non-interactive --platform android
```

### GitHub Actions — prerelease on `main`

Same as above with the trigger changed to `push: branches: [main]` and `--profile preview-pico`.

## 7. Troubleshooting

| Symptom                                                             | Likely cause                                                    | Fix                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `eas build` fails with `Task :app:assemblePicoDebug not found`       | `expo-pico-core` plugin not listed, or `buildVariant` is `'mobile'`. | Add the plugin, set `buildVariant: 'pico'` or `'dual'`.                                 |
| Platform SDK calls return `SERVICE_UNAVAILABLE` at runtime          | PICO Platform SDK AAR not on the classpath.                     | Real PICO SDK AAR isn't public yet. Siblings will auto-activate when it's dropped in (Phase J reflection probe). |
| `pvr.app.type` missing from merged manifest                          | `appType: '2d'` or `buildVariant: 'mobile'` is set.             | Set `appType: 'vr'` and `buildVariant: 'pico'`.                                         |
| APK installs but PICO launcher doesn't enumerate it as immersive    | Missing launcher contract.                                      | Run `expo-pico-doctor`; confirm OpenXR `IMMERSIVE_HMD` category lands in merged manifest (§5). |
| 32-bit ABI slice included in the AAB                                | `ndkAbiFilters: false` (explicit opt-out).                      | Flip to `true` unless you have a specific reason to ship armeabi-v7a.                   |
| `System.loadLibrary("openxr_loader")` fails at runtime              | `<uses-native-library>` not emitted.                             | Confirm `openXrLoaderDeclaration: true`; `targetSdkVersion >= 31` requires the declaration. |

## Links

- Top-level [README](../README.md)
- [PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) — single-page pre-ship checklist
- [RELEASING.md](../RELEASING.md) — how `expo-pico-*` packages themselves are released
- [ARCHITECTURE.md](../ARCHITECTURE.md) — full plugin / module design reference
- [EAS Build docs](https://docs.expo.dev/build/introduction/)
- [PICO Developer Platform](https://developer.picoxr.com/)
