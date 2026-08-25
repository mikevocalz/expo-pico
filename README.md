<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/assets/pico-wordmark-dark.svg">
  <img src="./docs/assets/pico-wordmark-light.svg" alt="PICO" height="34">
</picture>

# expo-pico

**Ship an Expo app to a PICO headset without ejecting to the bare workflow.**

[![Expo SDK 57](https://img.shields.io/badge/Expo_SDK-57-0B0B0C?style=flat-square&logo=expo&logoColor=white)](https://docs.expo.dev/)
[![New Architecture](https://img.shields.io/badge/React_Native-New_Architecture-0B0B0C?style=flat-square&logo=react&logoColor=61DAFB)](https://reactnative.dev/architecture/landing-page)
[![Nitro Modules](https://img.shields.io/badge/Nitro_Modules-0.37-0B0B0C?style=flat-square)](https://nitro.margelo.com)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](./docs/FAQ.md#2-why-is-this-android-only)
[![MIT](https://img.shields.io/badge/license-MIT-6B7280?style=flat-square)](./LICENSE)

Expo-native package family for PICO 4 / 4 Ultra (PICO OS 5) and Project Swan (PICO OS 6) XR devices.

Config plugins and Nitro Modules that teach an Expo Android project how to build, install, and enumerate on PICO 4, 4 Ultra, 4 Ultra Enterprise and Space Pro / Swan headsets without ejecting to the bare workflow. The plugin is renderer-agnostic. It works with `@reactvision/react-viro` (the example app's renderer), Unity-as-a-Library, and any renderer that uses the system OpenXR loader.

> OS note. PICO 4 and PICO 4 Ultra ship on PICO OS 5 (the legacy PVR / current XR runtime), so set `xrMode: 'pico-os5'`. The next-gen Project Swan hardware ships on PICO OS 6, so set `xrMode: 'pico-swan'`.

New here? [docs/QUICKSTART.md](./docs/QUICKSTART.md) walks you from a fresh project to a running PICO app. Common questions live in [docs/FAQ.md](./docs/FAQ.md).

## Packages

| Package                                                         | Status      | PPS 1.0.x backing                                                                                                                                                                                                                      |
| --------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`expo-pico-core`](./packages/expo-pico-core)                   | stable      | Build config, flavors, launcher contract, `expo-pico-doctor` CLI. The **XR runtime surface** (hand / eye / body / trackers / boundary) is a seam — see below                                                                           |
| [`expo-pico-account`](./packages/expo-pico-account)             | live        | `PicoSignInClient.getSignInClient` → `getUserInfo / signIn / signOut / getAccessToken`                                                                                                                                                 |
| [`expo-pico-iap`](./packages/expo-pico-iap)                     | live        | `PicoIapClient.getIapClient` → `getProductList / purchaseProduct / consumeProduct / getPurchasedProductList`                                                                                                                           |
| [`expo-pico-subscription`](./packages/expo-pico-subscription)   | partial     | routed through `IapClient` (PPS has no separate sub client); `cancelSubscription()` is `NOT_IN_PPS_1_0` — cancelling happens in the PICO Store                                                                                         |
| [`expo-pico-achievements`](./packages/expo-pico-achievements)   | live        | `AchievementClient.getArchievementClient` (PICO typo intentional): `unlock / addCount / addFields / getAllDefinitions / getProgressByName`                                                                                             |
| [`expo-pico-leaderboards`](./packages/expo-pico-leaderboards)   | live        | `LeaderboardClient.getLeaderboardClient`: `getLeaderboardArray / getEntries / getEntriesAfterRank / writeEntry`; emulated `getUserEntry`                                                                                               |
| [`expo-pico-social`](./packages/expo-pico-social)               | partial     | `PicoFriendClient.getFriendClient` (`getFriends / launchFriendRequestFlow / loadAccountInfo`) plus `PicoSocialClient.getSocialClient` (`setPresence / clearPresence / sendInvites`); accept/decline/block/unblock removed in PPS 1.0.x |
| [`expo-pico-notifications`](./packages/expo-pico-notifications) | live        | `PPSPushClient.getClientImpl` → `register(appId, fcmToken, IRegisterPPSPushCallback)` via reflection Proxy                                                                                                                             |
| [`expo-pico-spatial`](./packages/expo-pico-spatial)             | seam        | Eye / face / body / scene-mesh / anchors. Independent of PPS, and **not yet wired**: 8 of 11 methods reject with `XR_SDK_NOT_LINKED`, and no code path calls the XR SDK even when `pico-spatial-sdk.aar` is present                    |
| [`expo-pico-rooms`](./packages/expo-pico-rooms)                 | partial     | PPS 1.0.x removed dedicated rooms. `getFriendsAndRooms()` / `getRoomInfo()` read the friend discovery feed; every mutating call is `NOT_IN_PPS_1_0`. For create/join run state on Fishjam / Colyseus                                   |
| [`expo-pico-rtc`](./packages/expo-pico-rtc)                     | unavailable | PPS 1.0.x removed RTC. Use `@fishjam-cloud/react-native-webrtc`                                                                                                                                                                        |
| [`expo-pico-storage`](./packages/expo-pico-storage)             | unavailable | PPS 1.0.x removed cloud storage. Run per-player backend keyed off `account.getUserProfile().userId`, or `expo-secure-store` for local                                                                                                  |
| [`expo-pico-app-kit`](./packages/expo-pico-app-kit)             | n/a         | Orchestration over the siblings: boot probe, capability cache, no-op-safe wrappers. Calls no PPS service directly                                                                                                                      |
| [`expo-pico-template`](./packages/expo-pico-template)           | n/a         | Starter app preconfigured for PICO OS 6 / Swan. `npx create-expo-app --template expo-pico-template`                                                                                                                                    |

Every package README carries the same chip, so status travels with the package.

| Chip                                                                                        | Meaning                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![live](https://img.shields.io/badge/PPS_1.0.x-live-1F6F3F?style=flat-square)               | The bridge calls the real PPS 1.0.x SDK and returns real data.                                                                                                                              |
| ![partial](https://img.shields.io/badge/PPS_1.0.x-partial-946200?style=flat-square)         | Some methods wired; the rest return `NOT_IN_PPS_1_0` with a hint naming what PPS does offer.                                                                                                |
| ![unavailable](https://img.shields.io/badge/PPS_1.0.x-unavailable-6B7280?style=flat-square) | PPS 1.0.x publishes no artifact for this service, so every method returns `NOT_IN_PPS_1_0`. Kept as a typed seam so a future release can wire it without an API break.                      |
| ![n/a](https://img.shields.io/badge/PPS_1.0.x-n%2Fa-0B0B0C?style=flat-square)               | Calls no PPS service directly, so the axis does not apply.                                                                                                                                  |
| ![seam](https://img.shields.io/badge/PPS_1.0.x-seam-6B7280?style=flat-square)               | The TypeScript and Kotlin surface exists and is typed, but nothing is wired behind it yet. Distinct from `unavailable`: the platform API is real, this project just has not implemented it. |

> ### The XR runtime is not implemented
>
> `expo-pico-core`'s hand, eye, face, body, motion-tracker, controller,
> boundary and scene-mesh methods — 37 of them on `HybridPicoRuntime` — all
> route to a helper that rejects with `CAPABILITY_NOT_DECLARED` or
> `XR_SDK_NOT_LINKED`. There is **no branch that calls the PICO XR SDK**, so
> obtaining the licensed AAR and dropping it into `vendor/pico-sdk/` does not
> switch them on. `expo-pico-spatial` is the same for 8 of its 11 methods.
>
> What does work today is everything PPS-backed (account, IAP, subscription,
> achievements, leaderboards, social, notifications, rooms discovery), plus
> build configuration, the launcher contract, flavors, capability declaration
> and `getPicoRuntimeInfo()` / `getPicoDiagnostics()`, which read `BuildConfig`
> and `PackageManager` rather than the XR SDK.
>
> The seams are typed and documented so wiring them is additive rather than an
> API break. Until then, treat the XR runtime as unavailable.

`unavailable` is grey rather than red on purpose — a seam that reports its own
absence is behaving correctly. Nothing is broken; the platform simply does not
ship that service.

### Activating the platform-service bridges

PICO ships PPS 1.0.x on the public Volcengine maven (`https://artifact.bytedance.com/repository/Volcengine/`). `expo-pico-core`'s Gradle plugin adds the repo and the 11 `com.pico.pps:platform-service-{auth,iap,achievement,...}:1.0.0` coords automatically. No AAR drop-in, no developer-console login required. Install `@expo-pico/core`, prebuild, and the bridges are live on first launch.

The legacy AAR-drop-in path is still supported for projects on PVR 2.x; see [vendor/pico-sdk/README.md](./vendor/pico-sdk/README.md). (`docs/PLATFORM-SDK.md`, linked here previously, never existed.)

## Quick start

### Option 1: scaffold from the template

Ships with `expo-pico-core` already wired, a runtime diagnostics HUD, and a pre-flight doctor script.

```bash
npx create-expo-app --template @expo-pico/template my-pico-app
cd my-pico-app
yarn install
npx expo-pico-doctor       # lint the config
npx expo prebuild --clean  # generate android/
npx expo run:android --variant picoDebug
```

### Option 2: add to an existing Expo app

```bash
yarn add @expo-pico/core react-native-nitro-modules
# (add siblings as needed)
```

```ts
// app.config.ts
export default {
  expo: {
    name: 'my-pico-app',
    newArchEnabled: true,
    // 'default' — a locked orientation overrides the panel dimensions
    // the plugin writes via defaultWidth/defaultHeight.
    orientation: 'default',
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

## Supported devices

<table>
<tr>
<td width="200" valign="top">
<img src="./docs/assets/pico-4-ultra.jpg" alt="PICO 4 Ultra headset with two controllers" width="180">
</td>
<td valign="top">

### PICO 4 / PICO 4 Ultra

Ships on **PICO OS 5**, the legacy PVR / current XR runtime.

```ts
xrMode: 'pico-os5';
```

The 16KB-alignment overlay matters most here — PICO OS 5 on Android 14+ refuses
a 4KB-aligned `libopenxr_loader.so`, which is why `expo-pico-core` ships its
own. Verify a build with `./scripts/verify-16kb-alignment.py path/to/app.apk`.

</td>
</tr>
<tr>
<td width="200" valign="top">
<img src="./docs/assets/pico-space-pro-concept.jpg" alt="Concept render of a PICO Space Pro style headset" width="180">
</td>
<td valign="top">

### PICO Space Pro / Project Swan

Ships on **PICO OS 6**, the next-gen runtime.

```ts
xrMode: 'pico-swan';
```

Opt into the Swan runtime subproject with `picoSwan.swanRuntimeProject`, or the
Swan Maven dependency with `picoSwan.swanSdkArtifact`. `isSwanRuntime()` reports
which runtime initialised at runtime.

> The image above is a **concept render, not the shipping device** — it is an
> AI-generated illustration from a blog, kept only as a visual placeholder.
> Do not treat it as a reference for industrial design or optics.

</td>
</tr>
<tr>
<td width="200" valign="top">
<img src="./docs/assets/pico-4-ultra-enterprise.jpg" alt="PICO 4 Ultra Enterprise headset with two controllers" width="180">
</td>
<td valign="top">

### PICO 4 Ultra Enterprise

The managed-deployment variant of the 4 Ultra. Same **PICO OS 5** runtime and
the same `xrMode`:

```ts
xrMode: 'pico-os5';
```

Nothing in this family is consumer-only — `platformService` identity, IAP and
entitlement all work the same under enterprise provisioning. Fleet enrolment
and kiosk policy are handled by PICO Business Suite, outside the app.

</td>
</tr>
</table>

Not supported: iOS (there is no iOS PICO runtime), PICO Neo 3, and PICO 4
Enterprise on PVR 2.x without the legacy AAR drop-in — see
[vendor/pico-sdk/README.md](./vendor/pico-sdk/README.md).

## Compatibility

- Expo SDK 57 (current baseline). React Native 0.86.2. React 19.2. Hermes.
- New Architecture only (Fabric + TurboModules).
- Android only.
- Devices: see [Supported devices](#supported-devices).
- 16KB ELF page-alignment (Android 14+). `expo-pico-core` overlays a Khronos `libopenxr_loader.so` 1.1.62 to satisfy the system loader on PICO OS 5.

## Doctor

Lint your project's PICO plugin config before prebuild:

```bash
npx expo-pico-doctor              # pretty output
npx expo-pico-doctor --json       # machine-readable
npx expo-pico-doctor --fail-on-warning  # CI gate
```

Ships with `expo-pico-core`.

## Shipping

- [docs/QUICKSTART.md](./docs/QUICKSTART.md): bootstrap guide.
- [docs/FAQ.md](./docs/FAQ.md): why Expo, why Android-only, which renderer to use, release versioning.
- [docs/MIGRATING-FROM-VIRO.md](./docs/MIGRATING-FROM-VIRO.md): porting a ReactVision/Viro Quest (`OVR_MOBILE`) app to PICO.
- [docs/EAS.md](./docs/EAS.md): EAS Build profiles, secrets, signing, and PICO Store submission. Ships with a concrete `example/eas.json` you can copy.

## Development

```bash
yarn install
yarn build      # build all packages (core + plugin + CLI)
yarn typecheck  # turbo run typecheck across the workspace
yarn test
yarn lint
```

## Example app

```bash
cd example
npx expo prebuild --clean
npx expo run:android --variant picoDebug
```

The example opens on a designed home surface — an isometric cube mark, live `getPicoRuntimeInfo()` status chips, and an **Enter XR Scene** call to action — which routes into a `<ViroVRSceneNavigator>` holding an interactive cube you can drag with the controller ray, hover for a focus ring, and tap to recolour. A live position caption above the cube confirms the drag is real. `DiagnosticsPanel` (build-time and runtime diagnostics plus the SDK probe) and `ValidationHarness` (exercises every sibling module's public API) are reachable from the home screen.

Layout is breakpoint-driven rather than phone-shaped: PICO renders the 2D activity into a WindowContainer panel roughly 1000-1600dp wide, so the home screen goes two-column above 700dp and caps content width so line length stays readable. Every route stays mounted behind `<Freeze>` — unmounting the Viro navigator while its native session is live is the reliable way to crash the app, so inactive routes suspend instead of tearing down.

Viro's OpenXR binding composes with `expo-pico-core`'s launcher contract and the `libopenxr_loader.so` `<uses-native-library>` declaration. On PICO hardware the example runs as an end-to-end immersive XR app; on a non-XR device the same scene renders through the flat navigator.

## License

MIT
