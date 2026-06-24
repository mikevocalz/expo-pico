# expo-pico

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-56-000020.svg?logo=expo)](https://docs.expo.dev/)
[![Node >=18](https://img.shields.io/badge/node-%E2%89%A518-43853D.svg?logo=node.js&logoColor=white)](.nvmrc)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?logo=typescript&logoColor=white)](./tsconfig.base.json)
[![New Architecture](https://img.shields.io/badge/React%20Native-New%20Architecture-20232A.svg?logo=react)](https://reactnative.dev/architecture/landing-page)
[![Android only](https://img.shields.io/badge/platform-Android-3DDC84.svg?logo=android&logoColor=white)]()
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-ff69b4.svg)](./CONTRIBUTING.md)
[![Tests](https://img.shields.io/badge/tests-223%20passing-76b989.svg)](./packages/expo-pico-core/__tests__)

Expo-native package family for **PICO 4 / 4 Ultra (PICO OS 5)** and **Project Swan (PICO OS 6)** XR devices.

Config plugins + Expo Modules that teach an Expo Android project how to build, install, and enumerate correctly on PICO 4 / 4 Ultra / Swan and Meta Quest 3 / 3S headsets — without ejecting to a bare workflow. Renderer-agnostic: composes with `@reactvision/react-viro` (the example app's renderer), Unity-as-a-Library, and any renderer that uses the system OpenXR loader.

> **OS note.** PICO 4 and PICO 4 Ultra ship on **PICO OS 5** (the legacy PVR / current XR runtime) → `xrMode: 'pico-os5'`. The next-gen **Project Swan** hardware ships on **PICO OS 6** → `xrMode: 'pico-swan'`.

**New here?** [docs/QUICKSTART.md](./docs/QUICKSTART.md) walks you from zero to a running PICO app in 5 minutes. Common questions live in [docs/FAQ.md](./docs/FAQ.md).

## Packages

| Package                                                          | Status      | PPS 1.0.x backing                                          |
| ---------------------------------------------------------------- | ----------- | ---------------------------------------------------------- |
| [`expo-pico-core`](./packages/expo-pico-core)                    | stable      | Build config, flavors, launcher contract, runtime, `expo-pico-doctor` CLI |
| [`expo-pico-account`](./packages/expo-pico-account)              | live        | `PicoSignInClient.getSignInClient` → `getUserInfo / signIn / signOut / getAccessToken` |
| [`expo-pico-iap`](./packages/expo-pico-iap)                      | live        | `PicoIapClient.getIapClient` → `getProductList / purchaseProduct / consumeProduct / getPurchasedProductList` |
| [`expo-pico-subscription`](./packages/expo-pico-subscription)    | live        | routed through `IapClient` (PPS has no separate sub client); cancel returns `REQUIRES_OS_UI` |
| [`expo-pico-achievements`](./packages/expo-pico-achievements)    | live        | `AchievementClient.getArchievementClient` (PICO typo intentional) — `unlock / addCount / addFields / getAllDefinitions / getProgressByName` |
| [`expo-pico-leaderboards`](./packages/expo-pico-leaderboards)    | live        | `LeaderboardClient.getLeaderboardClient` — `getLeaderboardArray / getEntries / getEntriesAfterRank / writeEntry`; emulated `getUserEntry` |
| [`expo-pico-social`](./packages/expo-pico-social)                | partial     | `PicoFriendClient.getFriendClient` (`getFriends / launchFriendRequestFlow / loadAccountInfo`) + `PicoSocialClient.getSocialClient` (`setPresence / clearPresence / sendInvites`); accept/decline/block/unblock removed in PPS 1.0.x |
| [`expo-pico-notifications`](./packages/expo-pico-notifications)  | live        | `PPSPushClient.getClientImpl` → `register(appId, fcmToken, IRegisterPPSPushCallback)` via reflection Proxy |
| [`expo-pico-spatial`](./packages/expo-pico-spatial)              | live        | Native sensor SDK (eye, scene mesh, face, body) — independent of PPS; needs `pico-spatial-sdk.aar` for anchors/full-space |
| [`expo-pico-rooms`](./packages/expo-pico-rooms)                  | unavailable | PPS 1.0.x removed dedicated rooms. Read-only friend rooms via `friend.getFriendsAndRooms`; for create/join run state on Fishjam / Colyseus |
| [`expo-pico-rtc`](./packages/expo-pico-rtc)                      | unavailable | PPS 1.0.x removed RTC. Use `@fishjam-cloud/react-native-webrtc` |
| [`expo-pico-storage`](./packages/expo-pico-storage)              | unavailable | PPS 1.0.x removed cloud storage. Run per-player backend keyed off `account.getUserProfile().userId`, or `expo-secure-store` for local |

**live** = bridge calls the real PPS 1.0.x SDK and returns real data. **partial** = some methods wired, others return `NOT_IN_PPS_1_0` with an actionable hint. **unavailable** = every method returns `NOT_IN_PPS_1_0` (kept as a typed seam so future PPS releases can wire without an API break).

### Activating the platform-service bridges (zero-config)

PICO ships **PPS 1.0.x** on the **public Volcengine maven** (`https://artifact.bytedance.com/repository/Volcengine/`). `expo-pico-core`'s Gradle plugin adds the repo + the 11 `com.pico.pps:platform-service-{auth,iap,achievement,...}:1.0.0` coords automatically. No AAR drop-in, no developer-console login required — just install `@expo-pico/core`, prebuild, and the bridges are live on first launch.

The legacy AAR-drop-in path is still supported for projects on PVR 2.x; see [docs/PLATFORM-SDK.md](./docs/PLATFORM-SDK.md).

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
          // PICO 4 / 4 Ultra (PICO OS 5) → 'pico-os5'
          // PICO Swan      (PICO OS 6) → 'pico-swan'
          xrMode: 'pico-os5',
          appType: 'vr',
          buildVariant: 'pico',
          picoAppId: process.env.PICO_APP_ID,
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

- **Expo SDK 56** (current baseline) · React Native 0.86 · React 19.2 · Hermes
- **New Architecture only** (Fabric + TurboModules)
- **Android-only**
- Devices:
  - **PICO 4** / **PICO 4 Ultra** — PICO OS 5 (legacy PVR XR runtime) — `xrMode: 'pico-os5'`
  - **PICO Swan** — PICO OS 6 (next-gen runtime) — `xrMode: 'pico-swan'`
  - **Meta Quest 3** / **Quest 3S** — via the `quest` build flavor; OpenXR loader composes with the `<uses-native-library>` declaration the plugin writes
- 16KB ELF page-alignment (Android 14+) — `expo-pico-core` overlays a Khronos `libopenxr_loader.so` 1.1.49 to satisfy the system loader on PICO OS 5

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
- [docs/FAQ.md](./docs/FAQ.md) — why Expo, why Android-only, which renderer to use, release versioning.
- [docs/MIGRATING-FROM-VIRO.md](./docs/MIGRATING-FROM-VIRO.md) — porting a ReactVision/Viro Quest (`OVR_MOBILE`) app to PICO.
- [docs/EAS.md](./docs/EAS.md) — EAS Build profiles, secrets, signing, and PICO Store submission. Ships with a concrete `example/eas.json` you can copy.
- [docs/PRODUCTION-READINESS.md](./docs/PRODUCTION-READINESS.md) — single-page pre-ship checklist covering plugin config, identity, manifest contract, toolchain, diagnostics, and submission.

## Architecture

[ARCHITECTURE.md](./ARCHITECTURE.md) is the single source of truth for the design. 22 sections covering:

- §1–§14 — Foundational design: monorepo layout, config plugin strategy, versioning, failure modes, testing.
- §15 — PICO XR native runtime support (`xrMode`, `PicoCorePackage`, MainApplication wiring; OS 5 / OS 6 split).
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

The example renders a **ReactVision/Viro** immersive scene (Khronos BrainStem glTF auto-downloaded on install) inside `<ViroVRSceneNavigator>`, a live PICO runtime-info HUD, a full `DiagnosticsPanel` (build-time + runtime diagnostics + Phase J SDK probe), and the full `ValidationHarness` exercising every sibling module's public API. Viro's OpenXR binding composes with `expo-pico-core`'s launcher contract + the `libopenxr_loader.so` `<uses-native-library>` declaration from Phase E — on PICO / Meta Quest hardware the example is a working end-to-end immersive XR app; on a non-XR device it falls back to a flat preview.

## License

MIT
