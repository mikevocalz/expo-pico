# Quickstart

This guide gets a new Expo project running on a PICO 4 / 4 Ultra / Swan device with `expo-pico-core` wired and the example's diagnostics panel visible. No prior PICO setup required (beyond developer-mode on the headset).

Deeper references once you're up and running:

- [README](../README.md): package overview
- [docs/EAS.md](./EAS.md): hosted builds plus PICO Store submission

## 0. Prerequisites

- Node 20+ and yarn 1.x (or `npm`). The repo and templates are written for yarn; swap to `npm` / `pnpm` if you prefer.
- Android Studio with:
  - Command-line tools installed.
  - `ANDROID_HOME` on your `PATH`.
  - Android SDK 34, build tools 34.0.0, and NDK (installed via Android Studio's SDK Manager → SDK Tools → NDK, or via Expo's Gradle when building).
- A PICO device in developer mode.
  - Settings → About → tap Build Number 7 times → developer options unlock.
  - Enable USB debugging.
  - First `adb install` on a new device prompts for RSA trust on the headset.
- (Optional) PICO developer credentials. Needed for Platform SDK features (account, IAP, leaderboards, etc.). Register at [developer.picoxr.com](https://developer.picoxr.com/). You can skip this for a first hello-world.

## 1. Scaffold a new Expo app

Two paths. Pick one.

Shortcut: use the PICO template. Skips steps 2 and 3 entirely. `expo-pico-core` is already wired, `app.config.ts` is preconfigured, and `App.tsx` includes a live diagnostics HUD. Jump to step 4.

```bash
npx create-expo-app@latest --template expo-pico-template my-pico-app
cd my-pico-app
yarn install
```

Or start from the default template and install the plugin yourself (more flexibility if you're retrofitting an existing app):

```bash
npx create-expo-app@latest my-pico-app --template default
cd my-pico-app
```

Nothing PICO-specific yet. Verify it builds clean for mobile before adding PICO plumbing:

```bash
yarn install
npx expo start
```

Kill the dev server once you see the QR code. We're about to switch to the Android / PICO path.

## 2. Install the `expo-pico-core` plugin

```bash
yarn add expo-pico-core
```

Only `expo-pico-core` is required for the base build wiring. Add sibling packages (`expo-pico-account`, `expo-pico-iap`, etc.) as you need their surfaces.

## 3. Configure `app.config.ts`

Rename `app.json` to `app.config.ts` (Expo loads either) and paste:

```ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'my-pico-app',
  slug: 'my-pico-app',
  newArchEnabled: true, // required
  orientation: 'landscape',
  android: {
    package: 'com.example.mypicoapp',
  },
  plugins: [
    [
      '@expo-pico/core',
      {
        // Choose 'pico-os5' for PICO 4 / 4 Ultra, 'pico-swan' for Swan.
        // 'mobile' turns the plugin into a mostly-no-op for phone builds.
        xrMode: 'pico-os5',

        // 'vr' is the standard immersive launcher category. 'mr' for
        // passthrough-first apps. '2d' opts out of immersive entirely.
        appType: 'vr',

        buildVariant: 'pico', // writes the PICO flavor manifest

        // Optional until you need Platform SDK features:
        platformService: {
          picoAppId: process.env.PICO_PLATFORM_APP_ID,
          picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
        },

        // Turn on whatever hardware your app uses:
        handTracking: true,
        passthrough: true,
        // refreshRates: [72, 90, 120],
        // eyeTracking: true,
      },
    ],
  ],
});
```

Every plugin option is documented in [expo-pico-core's README](../packages/expo-pico-core/README.md#plugin-options).

### Lint before you prebuild

```bash
npx expo-pico-doctor
```

The doctor catches seven common misconfigs before `expo prebuild` mutates native files. On a fresh config you should see zero errors and one `identity.missing` warning, which is fine since you haven't set platform identity yet.

## 4. Regenerate native projects

```bash
npx expo prebuild --clean
```

This creates `android/` with:

- `flavorDimensions "device"` plus `mobile` / `pico` product flavors
- `pvr.app.type=vr` and OpenXR `IMMERSIVE_HMD` launcher categories in the PICO-flavor manifest
- `<uses-native-library android:name="libopenxr_loader.so"/>`
- `ndk { abiFilters 'arm64-v8a' }` on the pico flavor
- A `PicoCorePackage(PicoXRPlatform.PICO_OS5)` line added to `MainApplication.kt`

Inspect any of these if you want to verify. The plugin never writes anything it can't justify.

## 5. Run on a connected PICO

```bash
npx expo run:android --variant picoDebug
```

This compiles and installs the pico flavor APK. On first run the Gradle download plus build takes ~3 to 5 minutes; subsequent runs with warm caches finish in under a minute.

If you don't have a headset connected right now, use the mobile flavor to confirm the plugin didn't break anything:

```bash
npx expo run:android --variant mobileDebug
```

The mobile flavor is deliberately mostly-no-op. `expo-pico-core` doesn't touch the mobile manifest beyond `<queries>` deferred to the pico flavor.

## 6. Add a diagnostics panel

Drop this into `App.tsx` to see live runtime info:

```tsx
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import {
  getPicoDiagnostics,
  getPicoRuntimeInfo,
  getPlatformSdkProbe,
  formatDiagnostics,
  type PicoDiagnosticsReport,
  type PicoPlatformSdkProbe,
} from '@expo-pico/core';

export default function App() {
  const info = getPicoRuntimeInfo();
  const [report, setReport] = useState<PicoDiagnosticsReport | null>(null);
  const [probe, setProbe] = useState<PicoPlatformSdkProbe | null>(null);

  useEffect(() => {
    (async () => {
      setReport(await getPicoDiagnostics());
      setProbe(await getPlatformSdkProbe());
    })();
  }, []);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.body}>
      <Text style={styles.h1}>Runtime info</Text>
      <Text style={styles.mono}>{JSON.stringify(info, null, 2)}</Text>

      <Text style={styles.h1}>Platform SDK probe</Text>
      <Text style={styles.mono}>{JSON.stringify(probe, null, 2)}</Text>

      <Text style={styles.h1}>Diagnostics</Text>
      <Text style={styles.mono}>{report ? formatDiagnostics(report) : '…'}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0d1a' },
  body: { padding: 20 },
  h1: { color: '#ffffff', fontSize: 16, fontWeight: '700', marginTop: 16 },
  mono: { color: '#d0d4f0', fontFamily: 'monospace', fontSize: 12, marginTop: 8 },
});
```

The example app in this repo has a richer version of this with tabs, a 3D animating scene, a per-surface probe table, and a share button. See [`example/App.tsx`](../example/App.tsx) if you want to clone that layout.

## 7. What you should see

On a PICO device with developer mode enabled:

- `isPicoBuild`: true. The pico flavor is active.
- `isPicoDevice`: true. Device detection matched `Build.MANUFACTURER`.
- `xrMode`: 'pico-os5' (or `'pico-swan'` if you set that).
- `appType`: 'vr'.
- `platformSdkPresent`: should be `true` on a `picoDebug` build with network access during prebuild — `withPicoGradle` resolves the PPS Maven artifacts (`com.pico.pps:platform-service-*:1.0.0`) from the public Bytedance Maven repo automatically. Stays `false` only on a `mobile`-flavor build, on non-PICO hardware, or when Gradle couldn't reach the repo at prebuild time. The reflection probe flips it back to `true` as soon as the PPS classes (or, for the legacy PVR SDKs, a manually dropped AAR) are on the classpath.
- Diagnostics: one `identity.missing` info row until `platformService.picoAppId` is set. No errors.

On a mobile device or emulator (without `--variant picoDebug`):

- `isPicoBuild`: false, `isPicoDevice`: false.
- `xrMode`: 'mobile' (if `buildVariant: 'mobile'`) or the plugin-configured value (if the flavor manifest is still active but hardware isn't PICO).
- `build-device-mismatch` warning when the pico flavor runs on non-PICO hardware. Expected during dev.

## 8. Next steps

Pick the path that matches what you're building:

- A content or game app. Add `@reactvision/react-viro` (what the example app uses) and render an immersive `<ViroVRSceneNavigator>` scene. The PICO plugin is renderer-agnostic, so a custom OpenXR-loader renderer or Unity-as-a-Library also works.
- A social or multiplayer app. Install `expo-pico-rtc` (voice), `expo-pico-rooms` (matchmaking), and `expo-pico-social` (friends, presence, invites). Each sibling's README has a real usage snippet.
- A paid app with IAP. Install `expo-pico-iap` plus `expo-pico-subscription`. Add `picoMerchantId` and `picoPayKey` to your plugin's `platformService` block. Doctor warns on partial identity.
- A live service with backend. Install `expo-pico-account` (identity) and `expo-pico-notifications` (push). Your backend talks to the PICO Platform push endpoint using the same app ID and key the app is built with.

## 9. Shipping

When you're ready to submit to the PICO Store:

- Follow [docs/EAS.md](./EAS.md) to set up hosted builds, signing, and secrets.

## Troubleshooting

| Problem                                                                              | Likely cause                                                              | Fix                                                                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Task :app:assemblePicoDebug not found`                                              | Plugin not listed, or `buildVariant: 'mobile'`.                           | Add the plugin; set `buildVariant: 'pico'`.                                                                  |
| `SecurityException` on `RECORD_AUDIO` when using `expo-pico-rtc`                     | Runtime permission not yet granted.                                       | Call `requestPermissions()` at first-use site. Permission is declared automatically by the RTC plugin.       |
| PICO launcher shows the app in "2D apps" section instead of VR.                      | `pvr.app.type` / `IMMERSIVE_HMD` not landing.                             | Run `npx expo-pico-doctor`. Verify `appType: 'vr'` and `buildVariant: 'pico'`.                               |
| `System.loadLibrary("openxr_loader")` fails.                                         | `<uses-native-library>` not emitted.                                      | Confirm `openXrLoaderDeclaration: true` (the default). `targetSdkVersion >= 31` requires this declaration.   |
| Every PPS Platform SDK call (account, IAP, social, etc.) returns `SERVICE_UNAVAILABLE`. | Built the `mobile` flavor, running on non-PICO hardware, or Gradle was offline during prebuild and couldn't resolve `com.pico.pps:platform-service-*:1.0.0` from the Bytedance Maven repo. | Build the `picoDebug` variant on a PICO device. PPS deps are pulled from public Maven automatically by `withPicoGradle` — no AAR drop is needed for the modern PPS surfaces. |
| Programmatic `setPassthrough()` or `expo-pico-spatial` anchors return `SERVICE_UNAVAILABLE`. | These surfaces still depend on the **legacy** PICO Platform SDK 3.x / Spatial SDK 1.x (PVR-prefixed AARs), which are not on public Maven. | Download the AAR from the PICO Developer portal and drop it into `vendor/pico-sdk/` or `android/app/libs/`. Distinct from the modern PPS Maven artifacts. |
| Doctor says `identity.missing` but env vars are set locally.                         | `app.config.ts` reads from `process.env` but vars weren't loaded.         | Use a `.env` file plus `expo-dotenv`, or prefix the command: `PICO_PLATFORM_APP_ID=xyz npx expo prebuild`.   |
| Prebuild hangs on first run.                                                         | Gradle downloading dependencies over slow network.                        | Wait. Subsequent runs use the warm cache.                                                                    |

Still stuck? Check [FAQ.md](./FAQ.md) for common questions, or open an issue: https://github.com/mikevocalz/expo-pico/issues
