# expo-pico

Expo-native package family for **PICO OS 6** and **Project Swan** XR devices.

Config plugins + Expo Modules that teach an Expo Android project how to build, install, and enumerate correctly on PICO 4 / 4 Ultra / Swan headsets — without ejecting to a bare workflow. Renderer-agnostic: composes with `@react-three/fiber/native`, `@babylonjs/react-native`, Unity-as-a-Library, and anything else that uses the system OpenXR loader.

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

## Quick start

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
        'expo-pico-core',
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
- Forward-compatible with Expo SDK 56+ / RN 0.84.1+

## Doctor

Lint your project's PICO plugin config before prebuild:

```bash
npx expo-pico-doctor              # pretty output
npx expo-pico-doctor --json       # machine-readable
npx expo-pico-doctor --fail-on-warning  # CI gate
```

Ships with `expo-pico-core`. See [ARCHITECTURE §21](./ARCHITECTURE.md#21-expo-pico-doctor-cli-phase-g) for the full check list.

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

The example renders a `@react-three/fiber/native` animating scene, a live PICO runtime-info HUD, a full `DiagnosticsPanel` (build-time + runtime diagnostics + Phase J SDK probe), and the full `ValidationHarness` exercising every sibling module's public API.

## License

MIT
