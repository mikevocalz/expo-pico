---
"expo-pico-core": major
---

Adds PICO Swan OS native runtime support plus a stack of platform hardening phases.

All packages in the `expo-pico-*` family bump to 1.0.0 together — they are configured as `linked` in `.changeset/config.json`. The major bump reflects two realities:

1. Strict peer-semver: siblings declare `peerDependencies: { "expo-pico-core": ">=0.1.0" }`, and changesets cascades every peer-dep version change as a major bump on the consumer. Going from 0.1.x → 0.2.0 on core forces siblings to 1.0.0 regardless of declared range width.
2. Install-visible manifest changes: the Phase A launcher contract (`pvr.app.type`, `IMMERSIVE_HMD`, queries) and the Phase E `<uses-native-library>` + ABI filter change what APKs look like on disk. Consumers reviewing merged manifests on upgrade will see real diffs.

The plugin option API itself is strictly additive — every new option defaults off (or tracks an existing option like `xrMode`), so config written for 0.1.x keeps working unchanged.

## `expo-pico-core` (minor)

**Platform mode (Swan)**

- New `xrMode` plugin option (`'mobile' | 'pico-os6' | 'pico-swan'`). Drives MainApplication injection of `PicoCorePackage(PicoXRPlatform.<MODE>)` and the `PICO_XR_MODE` BuildConfig field.
- Opt-in `settings.gradle` Swan subproject inclusion via `picoSwan.swanRuntimeProject`; opt-in Swan Maven dep via `picoSwan.swanSdkArtifact`.
- Native seams `PicoSwanRuntime` and `PicoOs6Runtime` for per-platform runtime init.
- Runtime API: `getXrMode()`, `isSwanRuntime()`.

**Launcher contract (Phase A)**

- New `appType` option (`'vr' | 'mr' | '2d'`) emits `pvr.app.type` meta-data, OpenXR `IMMERSIVE_HMD` + `com.pico.intent.category.VR` + legacy `com.picovr.intent.category.VR` on `.MainActivity`, and `<queries>` for `com.pico.os.systemui` + `com.pico.platform`.
- Runtime API: `getAppType()`.

**Platform SDK identity (Phase B)**

- New `platformService` option: `picoAppId`, `picoAppKey`, `picoMerchantId`, `picoPayKey`, optional `foreign` region pair, `declareActivities`.
- Emits `pico_app_id` / `_foreign` / `_key` string resources, IAP resources, and the `com.pico.loginpaysdk.UnityAuthInterface` + `PicoSDKBrowser` activities.
- BuildConfig fields: `PICO_APP_KEY`, `PICO_HAS_PLATFORM_IDENTITY`, `PICO_HAS_IAP_IDENTITY`.
- Runtime API: `hasPlatformIdentity()`, `hasIapIdentity()`.

**Hardware capabilities (Phase C + D)**

- New capability options: `eyeTracking`, `faceTracking`, `bodyTracking`, `spatialAudio`, `foveatedRendering`, `highSamplingRateSensors`, `refreshRates: number[]`, `boundary`, `sceneMesh`. Each emits `uses-feature` (`android:required="false"`), `uses-permission`, and/or meta-data entries.
- `PicoSpatialMode` gains `volume` (PICO OS 6 3D Volume container).

**Platform hardening (Phase E)**

- New `ndkAbiFilters` option (default true under PICO xrModes): restricts `pico`/`dual` flavors to `arm64-v8a`. The `mobile` flavor is never filtered.
- New `openXrLoaderDeclaration` option (default true under PICO xrModes): emits `<uses-native-library android:name="libopenxr_loader.so" android:required="false"/>`. Required for `targetSdkVersion >= 31`. Renderer-agnostic — works with `@react-three/fiber/native` + `expo-gl`, `@babylonjs/react-native` OpenXR plugin, Unity-as-a-Library, and any Android renderer using the system OpenXR loader.
- New prebuild diagnostics (`withPicoDiagnostics`) emits `WarningAggregator` warnings for seven misconfig patterns (immersive-without-identity, 2d-with-pico-xrMode, mobile-with-immersive-appType, capability-toggles-under-mobile, Swan-subproject-without-Swan, refreshRates-under-mobile, partial IAP identity).

**Runtime diagnostics (Phase F)**

- New diagnostics API: `getPicoDiagnostics()`, `buildDiagnosticsReport()`, `readBuildTimeFacts()`, `readRuntimeFacts()`, `formatDiagnostics()`.
- Native module gains three async functions (`hasSystemFeature`, `getDeclaredFeatures`, `getDeclaredPermissions`) wrapping `PackageManager`.
- Seven finding classes: `identity.missing`, `feature.missing:*`, `build-device-mismatch`, `mobile-on-pico-device`, `feature.optional-missing:*`, `swan/os6.uninitialized`, `permission.ungranted:*`.

## Sibling packages (linked, minor)

All sibling packages (`expo-pico-spatial`, `expo-pico-account`, `expo-pico-iap`, `expo-pico-notifications`, `expo-pico-rtc`, `expo-pico-rooms`, `expo-pico-subscription`, `expo-pico-storage`, `expo-pico-social`, `expo-pico-achievements`, `expo-pico-leaderboards`) bump in lockstep per the `linked` policy.

- Package metadata hardening: `repository` URL now points to `github.com/mikevocalz/expo-pico`, `files` array restricted to the published surface (`build`, `android`, `plugin/build`, `app.plugin.js`, `expo-module.config.json`), `homepage` and `bugs` populated.
- No code changes.
