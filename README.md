# expo-pico

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-55-000020.svg?logo=expo)](https://docs.expo.dev/)
[![Node >=18](https://img.shields.io/badge/node-%E2%89%A518-43853D.svg?logo=node.js&logoColor=white)](.nvmrc)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?logo=typescript&logoColor=white)](./tsconfig.base.json)
[![New Architecture](https://img.shields.io/badge/React%20Native-New%20Architecture-20232A.svg?logo=react)](https://reactnative.dev/architecture/landing-page)
[![Android only](https://img.shields.io/badge/platform-Android-3DDC84.svg?logo=android&logoColor=white)]()
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg)](./CONTRIBUTING.md)
[![Tests](https://img.shields.io/badge/tests-223%20passing-76b989.svg)](./packages/expo-pico-core/__tests__)

Expo-native package family for **PICO OS 6** and **Project Swan** XR devices.

Config plugins + Expo Modules that teach an Expo Android project how to build, install, and enumerate correctly on PICO 4 / 4 Ultra / Swan headsets — without ejecting to a bare workflow. Renderer-agnostic: composes with `@react-three/fiber/native`, `@babylonjs/react-native`, Unity-as-a-Library, and anything else that uses the system OpenXR loader.

**New here?** [docs/QUICKSTART.md](./docs/QUICKSTART.md) walks you from zero to a running PICO app in 5 minutes. Common questions live in [docs/FAQ.md](./docs/FAQ.md).

## Packages

| Package                                                          | Status            | Description                                                    |
| ---------------------------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| [`expo-pico-core`](./packages/expo-pico-core)                    | stable candidate  | Build config, flavors, launcher contract, runtime detection, `expo-pico-doctor` CLI |
| [`expo-pico-spatial`](./packages/expo-pico-spatial)              | alpha (seams)     | Space states, containers, anchors, scene mesh                  |
| [`expo-pico-account`](./packages/expo-pico-account)              | alpha (seams)     | PICO account identity                                          |
| [`expo-pico-iap`](./packages/expo-pico-iap)                      | alpha (seams)     | PICO store in-app purchases                                    |
| [`expo-pico-subscription`](./packages/expo-pico-subscription)    | alpha (seams)     | Subscription billing + entitlements                            |
| [`expo-pico-notifications`](./packages/expo-pico-notifications)  | alpha (seams)     | Push registration + tokens                                     |
| [`expo-pico-rtc`](./packages/expo-pico-rtc)                      | alpha (seams)     | Real-time voice channels                                       |
| [`expo-pico-rooms`](./packages/expo-pico-rooms)                  | alpha (seams)     | Rooms + matchmaking                                            |
| [`expo-pico-social`](./packages/expo-pico-social)                | alpha (seams)     | Friends, presence, invites                                     |
| [`expo-pico-storage`](./packages/expo-pico-storage)              | alpha (seams)     | Cloud storage                                                  |
| [`expo-pico-achievements`](./packages/expo-pico-achievements)    | alpha (seams)     | Achievements                                                   |
| [`expo-pico-leaderboards`](./packages/expo-pico-leaderboards)    | alpha (seams)     | Leaderboards                                                   |

"alpha (seams)" means the full JS + native module shape is in place and `expo-pico-core` correctly mutates the manifest / Gradle / strings surface each sibling needs. Bridge methods return `SERVICE_UNAVAILABLE` until the PICO Platform SDK AAR is on the classpath. [Phase J reflection detection](./ARCHITECTURE.md#22-reflection-based-pico-platform-sdk-detection-phase-j) activates them automatically when the AAR is present — no code change required.

### Activating the platform-service bridges (AAR drop-in)

The reflection bridges activate the moment the **PICO Platform SDK AAR** is on the gradle classpath. The AAR isn't on Pico's public maven repo — it's gated behind your developer-console login.

1. PPS Development Platform → your app → **App Information → SDK Download** → grab the **Platform SDK** AAR (and the **Spatial SDK** AAR for room mesh / scene anchors).
2. Drop it in your app's `android/app/libs/` (create the folder if needed).
3. Add to `android/app/build.gradle` inside the `pico` flavor (or top-level `dependencies` block):
   ```groovy
   picoImplementation fileTree(dir: 'libs', include: ['*.aar'])
   ```
4. Rebuild. `expo-pico-core`'s `PicoPlatformSdkDetector` picks up the SDK class on next launch; every `is{Name}Available()` in the sibling packages flips to `true` for services you've also activated in PPS.

This is intentionally a manual step — Pico hasn't published the AAR to a public maven coord, and we don't ship it bundled to keep the packages license-clean.

## Quick start

### Option 1 — scaffold from the template (fastest)

Ships with `expo-pico-core` already wired, a runtime diagnostics HUD, and a pre-flight doctor script.

```bash
npx create-expo-app --template expo-pico-template my-pico-app
cd my-pico-app
yarn install
npx expo-pico-doctor       # lint the config
npx expo prebuild --clean  # generate android/
npx expo run:android --variant picoDebug
```

### Option 2 — add to an existing Expo app

```bash
yarn add expo-pico-core
# (add siblings as needed)
```

```ts
// app.config.ts
export default {
  expo: {
    name: 'my-pico-app',
    newArchEnabled: true,
    orientation: 'landscape',
    plugins: [
      [
        '@expo-pico/core',
        {
          xrMode: 'pico-swan',
          appType: 'vr',
          buildVariant: 'pico',
          platformService: {
            picoAppId: process.env.PICO_PLATFORM_APP_ID,
            picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
          },
          handTracking: true,
          passthrough: true,
          refreshRates: [72, 90, 120],
        },
      ],
    ],
  },
};
```

```bash
npx expo prebuild --clean
npx expo run:android --variant picoDebug
```

## Compatibility

- **Expo SDK 55** (stable baseline)
- **New Architecture only**
- **Android / PICO OS 6** (PICO 4, PICO 4 Ultra, Swan, Neo3)
- Tracks RN 0.84.1 today; forward-compatible with Expo SDK 56+ per Expo's own support matrix

## Doctor

Lint your project's PICO plugin config before prebuild:

```bash
npx expo-pico-doctor              # pretty output
npx expo-pico-doctor --json       # machine-readable
npx expo-pico-doctor --fail-on-warning  # CI gate
```

Ships with `expo-pico-core`. See [ARCHITECTURE §21](./ARCHITECTURE.md#21-expo-pico-doctor-cli-phase-g) for the full check list.

## Shipping

- [docs/QUICKSTART.md](./docs/QUICKSTART.md) — zero-to-running in 5 minutes.
- [docs/FAQ.md](./docs/FAQ.md) — why Expo, why Android-only, how this differs from Viro, Babylon compat, release versioning.
- [docs/MIGRATING-FROM-VIRO.md](./docs/MIGRATING-FROM-VIRO.md) — porting a ReactVision/Viro Quest (`OVR_MOBILE`) app to PICO.
- [docs/EAS.md](./docs/EAS.md) — EAS Build profiles, secrets, signing, and PICO Store submission. Ships with a concrete `example/eas.json` you can copy.
- [docs/PRODUCTION-READINESS.md](./docs/PRODUCTION-READINESS.md) — single-page pre-ship checklist covering plugin config, identity, manifest contract, toolchain, diagnostics, and submission.

## Architecture

[ARCHITECTURE.md](./ARCHITECTURE.md) is the single source of truth for the design. 22 sections covering:

- §1–§14 — Foundational design: monorepo layout, config plugin strategy, versioning, failure modes, testing.
- §15 — PICO Swan OS native runtime support (`xrMode`, `PicoCorePackage`, MainApplication wiring).
- §16 — Launcher contract correctness (`pvr.app.type`, OpenXR `IMMERSIVE_HMD`, `<queries>`).
- §17 — PICO Platform SDK identity (strings, activities, BuildConfig).
- §18 — Hardware capability declarations (eye / face / body / audio / foveation / refresh rates).
- §19 — Platform hardening: OpenXR loader, ABI filter, prebuild diagnostics, renderer matrix.
- §20 — Runtime capability introspection (`getPicoDiagnostics`).
- §21 — `expo-pico-doctor` CLI.
- §22 — Reflection-based PICO Platform SDK detection.

## Releasing

[RELEASING.md](./RELEASING.md) covers the full flow — changesets, auto-opened Version Packages PR, `NPM_TOKEN`, prerelease cycle (alpha / beta / rc), linked versioning rationale, and rollback playbook.

## Development

```bash
yarn install
yarn build      # build all packages (core + plugin + CLI)
yarn typecheck  # turbo run typecheck across the workspace
yarn test       # turbo run test (223+ tests)
yarn lint
```

## Example app

```bash
cd example
npx expo prebuild --clean
npx expo run:android --variant picoDebug
```

The example renders a **Babylon React Native** animating scene (Khronos BrainStem glTF auto-downloaded on install), a live PICO runtime-info HUD, a full `DiagnosticsPanel` (build-time + runtime diagnostics + Phase J SDK probe), and the full `ValidationHarness` exercising every sibling module's public API. Babylon's OpenXR binding composes with `expo-pico-core`'s launcher contract + the `libopenxr_loader.so` `<uses-native-library>` declaration from Phase E — on PICO hardware the example is a working end-to-end XR app, on mobile it falls back to a 2D canvas.

## License

MIT
