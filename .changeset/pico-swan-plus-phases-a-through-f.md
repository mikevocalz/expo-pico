---
'@expo-pico/core': major
'@expo-pico/platform-service-common': major
---

Migrates the whole family to Nitro Modules, and adds PICO Swan OS native
runtime support plus a stack of platform hardening.

All packages in the `expo-pico-*` family bump to 1.0.0 together — they are configured as `linked` in `.changeset/config.json`. The major bump reflects two realities:

1. Strict peer-semver: siblings declare `peerDependencies: { "@expo-pico/core": ">=0.1.0" }`, and changesets cascades every peer-dep version change as a major bump on the consumer. Going from 0.1.x → 0.2.0 on core forces siblings to 1.0.0 regardless of declared range width.
2. Install-visible manifest changes: the launcher contract (`pvr.app.type`, `IMMERSIVE_HMD`, queries) and the `<uses-native-library>` + ABI filter change what APKs look like on disk. Consumers reviewing merged manifests on upgrade will see real diffs.

The plugin option API itself is strictly additive — every new option defaults off (or tracks an existing option like `xrMode`), so config written for 0.1.x keeps working unchanged.

## `expo-pico-core` (minor)

**Platform mode (Swan)**

- New `xrMode` plugin option (`'mobile' | 'pico-os5' | 'pico-swan'`). Drives MainApplication injection of `PicoCorePackage(PicoXRPlatform.<MODE>)` and the `PICO_XR_MODE` BuildConfig field.
- Opt-in `settings.gradle` Swan subproject inclusion via `picoSwan.swanRuntimeProject`; opt-in Swan Maven dep via `picoSwan.swanSdkArtifact`.
- Native seams `PicoSwanRuntime` and `PicoOs5Runtime` for per-platform runtime init.
- Runtime API: `getXrMode()`, `isSwanRuntime()`.

**Launcher contract**

- New `appType` option (`'vr' | 'mr' | '2d'`) emits `pvr.app.type` meta-data, OpenXR `IMMERSIVE_HMD` + `com.pico.intent.category.VR` + legacy `com.picovr.intent.category.VR` on `.MainActivity`, and `<queries>` for `com.pico.os.systemui` + `com.pico.platform`.
- Runtime API: `getAppType()`.

**Platform SDK identity**

- New `platformService` option: `picoAppId`, `picoAppKey`, `picoMerchantId`, `picoPayKey`, optional `foreign` region pair, `declareActivities`.
- Emits `pico_app_id` / `_foreign` / `_key` string resources, IAP resources, and the `com.pico.loginpaysdk.UnityAuthInterface` + `PicoSDKBrowser` activities.
- BuildConfig fields: `PICO_APP_KEY`, `PICO_HAS_PLATFORM_IDENTITY`, `PICO_HAS_IAP_IDENTITY`.
- Runtime API: `hasPlatformIdentity()`, `hasIapIdentity()`.

**Hardware capabilities**

- New capability options: `eyeTracking`, `faceTracking`, `bodyTracking`, `spatialAudio`, `foveatedRendering`, `highSamplingRateSensors`, `refreshRates: number[]`, `boundary`, `sceneMesh`. Each emits `uses-feature` (`android:required="false"`), `uses-permission`, and/or meta-data entries.
- `PicoSpatialMode` gains `volume` (PICO OS 6 3D Volume container).

**Platform hardening**

- New `ndkAbiFilters` option (default true under PICO xrModes): restricts `pico`/`dual` flavors to `arm64-v8a`. The `mobile` flavor is never filtered.
- New `openXrLoaderDeclaration` option (default true under PICO xrModes): emits `<uses-native-library android:name="libopenxr_loader.so" android:required="false"/>`. Required for `targetSdkVersion >= 31`. Renderer-agnostic — works with `@reactvision/react-viro` (example app), Unity-as-a-Library, and any Android renderer using the system OpenXR loader.
- New prebuild diagnostics (`withPicoDiagnostics`) emits `WarningAggregator` warnings for seven misconfig patterns (immersive-without-identity, 2d-with-pico-xrMode, mobile-with-immersive-appType, capability-toggles-under-mobile, Swan-subproject-without-Swan, refreshRates-under-mobile, partial IAP identity).

**Runtime diagnostics**

- New diagnostics API: `getPicoDiagnostics()`, `buildDiagnosticsReport()`, `readBuildTimeFacts()`, `readRuntimeFacts()`, `formatDiagnostics()`.
- Native module gains three async functions (`hasSystemFeature`, `getDeclaredFeatures`, `getDeclaredPermissions`) wrapping `PackageManager`.
- Seven finding classes: `identity.missing`, `feature.missing:*`, `build-device-mismatch`, `mobile-on-pico-device`, `feature.optional-missing:*`, `swan/os6.uninitialized`, `permission.ungranted:*`.

## Sibling packages (linked, minor)

All sibling packages (`expo-pico-spatial`, `expo-pico-account`, `expo-pico-iap`, `expo-pico-notifications`, `expo-pico-rtc`, `expo-pico-rooms`, `expo-pico-subscription`, `expo-pico-storage`, `expo-pico-social`, `expo-pico-achievements`, `expo-pico-leaderboards`) bump in lockstep per the `linked` policy.

- Package metadata hardening: `repository` URL now points to `github.com/mikevocalz/expo-pico`, `files` array restricted to the published surface (`build`, `android`, `plugin/build`, `app.plugin.js`, `expo-module.config.json`), `homepage` and `bugs` populated.
- No code changes.

## Nitro Modules migration (breaking)

The native surface moves off `expo-modules-core`'s module bridge onto
[Nitro Modules](https://nitro.margelo.com). Every package now ships a
`nitro.json`, a `*.nitro.ts` spec, a Kotlin `Hybrid*` implementation, a C++
registration TU, and a `CMakeLists.txt`; `nitrogen/generated` is part of the
published `files` because `android/build.gradle` and `android/CMakeLists.txt`
both `apply from:` / `include()` it.

**Consumers must install `react-native-nitro-modules` (>= 0.37.0)** — it is a
declared peer dependency, not a transitive one.

Build scripts change from `expo-module build` to `nitrogen && tsc`.
`expo-module-scripts` is gone entirely; per-package `.eslintrc.js` and the
plugin `tsconfig.json` files that extended it now inherit from the repo root
`.eslintrc.js` and `tsconfig.base.json`.

### API breaks beyond the native swap

- **`@expo-pico/platform-service-common`** drops `createNativeEventEmitter`,
  `safeAddListener`, `resolveNativeModule`, `PicoPage` and `DEFAULT_PAGE_SIZE`.
  Nitro listeners are id-based, so listener registration returns a numeric id
  wrapped in a `Subscription`; use `resolveHybridObject` in place of
  `resolveNativeModule`.
- **`@expo-pico/storage`** — `saveEntry(key, value, type, options?)` takes a
  required `StorageEntryType` as its third argument. Previously
  `saveEntry(key, value, options?)`.
- **`@expo-pico/rooms`** — `RoomSessionState.roomId` and `.role` are now
  optional (`undefined` when absent) rather than `null`. Nitro specs have no
  null, so the absent case crosses the bridge as `undefined`. Check with
  `== null` or `?.` if you need to accept both.
- **`@expo-pico/core`** — `capabilities.hand.triggerHaptic()` renames its first
  parameter `hand` to `side`. Positional, so callers are unaffected; named-
  argument or `.length`-style reflection is not.

### New PPS-backed exports

Verified against `javap` on the published AARs, not inferred.

- **`@expo-pico/account`** — `getAdultStatus()`, `getAuthorizedScopes()`,
  `requestAuthScopes(scopes)`, `cancelAuthorization()`. `getAdultStatus()`
  returns `'unknown' | 'minor' | 'adult'` rather than a boolean, because PPS
  distinguishes an unverified account from a confirmed minor and an age gate
  needs that distinction.
- **`@expo-pico/iap`** — `isProductPurchased(sku)`, a per-SKU ownership check
  that avoids pulling the whole purchase list.

### `@expo-pico/rooms` — new export

`getFriendsAndRooms()` surfaces the read-only friends-and-rooms discovery feed
that previously existed only inside `getRoomInfo()`. Returns one `RoomInfo` per
distinct room, `[]` when no friend is in one. `memberCount` counts the friends
visible in that room, not the room's true occupancy, which PPS does not report.
PPS marks the underlying call `@Deprecated("Legacy")` with no replacement.

### Docs

`orientation` in the QUICKSTART, migration guide and `@expo-pico/core` README
examples was `'landscape'`, which contradicts `expo-pico-doctor` — a locked
orientation writes `android:screenOrientation` onto MainActivity and overrides
the `defaultWidth`/`defaultHeight` the plugin writes. All three now show
`orientation: 'default'` with the rationale inline.
