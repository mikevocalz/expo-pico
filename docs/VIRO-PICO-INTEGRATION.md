# Viro + Expo-PICO integration

PICO is a native Viro platform, alongside Quest and visionOS. The three repositories have distinct responsibilities:

| Layer            | Repository                                                                                             | Responsibility                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Renderer         | [mikevocalz/virocore](https://github.com/mikevocalz/virocore)                                          | OpenXR sessions, PICO controller profiles, rendering, passthrough, initialized native capabilities    |
| React API        | [mikevocalz/viro](https://github.com/mikevocalz/viro)                                                  | `ViroXRSceneNavigator`, shared immersive activity, scene navigation, Studio, native bridge            |
| Expo platform    | [mikevocalz/expo-pico](https://github.com/mikevocalz/expo-pico)                                        | `pico` flavor, PICO activity metadata, native package registration, platform services and diagnostics |
| Quest comparison | [expo-horizon-core](https://github.com/software-mansion-labs/expo-horizon/tree/main/expo-horizon-core) | `quest` flavor and Horizon platform configuration                                                     |

`PICO` and `QUEST` use Viro's existing OpenXR renderer and shared `VRActivity` / `VRQuestScene` entry. That component name remains for compatibility. visionOS retains its native immersive-space path and a plain `ViroScene` root. PICO CLI operates around this stack; it does not replace Viro with a Spatial SDK or Unity project.

## November 4, 2026 integration status

The workspace is now aligned to Expo SDK 58 / React Native 0.88.1, the public example uses ViroReact 3.0.2 plus the published `expo-horizon-core@58.0.1` for reproducible CI, obsolete SDK57 patch-package overrides have been removed, and the SDK 58 Yarn lockfile has been regenerated from the upgraded workspace manifests.

**Native source**: [mikevocalz/viro](https://github.com/mikevocalz/viro) `main` declares `3.1.0-moyo.0` (commit `8075d97bb3584a04a76a0cda7846dfe5fc2ae483`, tagged `v3.1.0-moyo.0`); [mikevocalz/virocore](https://github.com/mikevocalz/virocore) `main` contains the corresponding 3.1.0 engine sources (commit `8a5bdc47aa0f47d9c6249461ef5f07fe77fe60ac`). Upstream [ReactVision/viro #574](https://github.com/ReactVision/viro/pull/574) is a pending 3.1.0 release PR; **do not assume the stock npm `@reactvision/react-viro@3.0.2` example contains those native changes**.

**Expo integration**: Expo SDK 58 / React Native 0.88 / React 19.3. `@expo-pico/core` now creates the `pico` flavor without `PICO_APP_ID` or a Platform Service app key. No registered PICO account is needed to build the XR renderer; account, achievements, IAP and other authenticated Platform Service calls remain credential-gated. Launching is a separate gate: PICO OS 5 closes an immersive build at startup when its app ID is not registered for the package ([PICO-ENTITLEMENT-BLOCKS-LAUNCH.md](PICO-ENTITLEMENT-BLOCKS-LAUNCH.md)), so a device run still needs a registered `PICO_APP_ID`. The example config enables `xRMode: ['QUEST', 'PICO']` and the corresponding native plugins.

**Binary gate**: the example still uses the published Viro 3.0.2 dependency and its legacy compatibility overlays. The Viro paired-package workflow builds and verifies the Android renderer and bridge together as a release-maintainer operation. Apple/visionOS and web/WASM binaries remain separate release steps; source version checks and CI unit tests do not establish a working compiled 3.1.0 renderer. After a _paired, verified_ Viro 3.1.0 native build, disable compatibility overlays and prove the APK's arm64 ELF alignment plus ZIP alignment.

The React bridge, native renderer, OpenXR loader, controller profile and world-mesh/VPS capabilities must come from a compatible artifact set. Do not mix a new Java/JNI bridge with an older `libviro_renderer.so` or let an overlay silently replace the renderer under test.

## Install a complete renderer package

An application installs one Viro package containing both native AARs. Gradle
uses those packaged libraries on every build, including after a clean Expo
prebuild. Application developers do not build ViroCore or copy individual AARs.
Install a verified package tarball, or pin the commit of a release branch that
contains the same verified package contents. Keep that dependency in the app's
lockfile. A source commit or version label alone does not prove which native
binaries were shipped.

The fork's unqualified GitHub URL follows its default branch, which can differ
from `main`. Use an explicit verified release commit. Doctor and Pico prebuild
check that the installed `@reactvision/react-viro` contains both Android AARs;
when `android/native-artifacts.json` is present, they also check the recorded
hashes. Reinstall the complete pinned package if those checks fail.

## Configure the coordinated fork build

Use a package built from the matching Viro and ViroCore changes. The public package currently pinned in `example/package.json` is not evidence that these native changes are included. Keep the canonical package name `@reactvision/react-viro` when packaging this fork: the Android plugin resolves its native projects under that name.

```ts
plugins: [
  ['@reactvision/react-viro', { android: { xRMode: ['PICO'] } }],
  [
    '@expo-pico/core',
    {
      buildVariant: 'pico',
      xrMode: 'pico-os5',
      appType: 'mr',
      passthrough: true,
      // For the rebuilt, verified ViroCore AAR:
      openXrLoaderOverlay: false,
      viroRendererOverlay: false,
    },
  ],
];
```

If shipping Quest too, keep the Horizon plugin and use Viro `xRMode: ['QUEST', 'PICO']`. Expo-PICO and Horizon share the `device` flavor dimension. PICO falls back to Horizon's `mobile` library variant, Quest falls back to Expo-PICO's `mobile` variant, and `dual` tries `pico` then `mobile` for dependencies. This uses [Gradle matchingFallbacks](https://developer.android.com/build/build-variants#resolve_matching_errors); `missingDimensionStrategy` is for an absent dimension.

Let Viro register `VRQuestScene`. Mount `ViroXRSceneNavigator` from the panel to set the scene intent and launch the immersive activity. Do not replace its registration with `registerImmersiveScene` when using this navigator. That helper remains available for custom roots. Launching `.VRActivity` directly from a cold app bypasses intent setup.

PICO-only configuration now generates `VRActivity.kt` without Quest metadata or Quest SDK/ABI overrides. Expo-PICO supplies the PICO contract in `app/src/pico/AndroidManifest.xml` (also `src/dual` when selected). An existing manually edited `VRActivity.kt` is preserved; inspect it when adopting a newer template.

Legacy loader overrides remain enabled by default for compatibility. Renderer overrides remain opt-in. The loader override is confined to `src/pico` / `src/dual`. The renderer override and its controller asset also go to `src/quest`, since the floor origin and controller mesh are Viro/OpenXR behaviour; `src/main` and `src/mobile` get neither. Variant packaging rules follow the same split. Prebuild tracks file hashes, updates same-size content, and removes known obsolete overrides. It stops with the affected path if a custom override cannot be attributed to the plugin. Disable both overrides when validating the new paired native build, so a staged older `.so` cannot mask it. `openXrLoaderDeclaration` is a separate manifest setting.

## Build and verify a release package

This step belongs to the Viro release maintainer. From clean Viro and ViroCore
checkouts with their build tools installed, use Viro's paired-package command:

```sh
python3 scripts/build-pico-package.py build \
  --virocore ../virocore \
  --virocore-commit 8a5bdc47aa0f47d9c6249461ef5f07fe77fe60ac \
  --out /absolute/artifacts
```

The command invokes the pinned ViroCore builder, verifies its source and
alignment metadata, compiles the bridge against that renderer while preserving
the full compatibility classes JAR, and verifies the actual npm tarball. The
package manifest records both source commits and hashes. Failed builds restore
the previous pair. See Viro's
[native release guide](https://github.com/mikevocalz/viro/blob/main/docs/PICO-NATIVE-RELEASE.md)
for prerequisites and the equivalent GitHub Actions workflow. Distribute the
verified complete package to applications.

The consuming application then runs normal Expo prebuild and builds
`:app:assemblePicoDebug` with `-PreactNativeArchitectures=arm64-v8a`. Check the
resulting APK as well as the input package:

```sh
python3 scripts/verify-16kb-alignment.py /absolute/app-pico-debug.apk
zipalign -v -c -P 16 4 /absolute/app-pico-debug.apk
```

The Python gate rejects missing arm64 libraries, malformed ELF headers and any under-aligned load segment. ZIP alignment is a separate check. [Android's 16KB guidance](https://developer.android.com/guide/practices/page-sizes) concerns devices using 16KB pages; Android/PICO OS version alone does not establish the page size.

## PICO CLI 0.6.0

The [PICO CLI announcement](https://developer.picoxr.com/blog/pico-cli-is-now-live/) adds device, deployment and diagnostic workflows. These scripts use verified 0.6.0 hierarchical command syntax and pin the npm package. Node 20+ and npm are required; CLI execution may download that version on first use. They do not run `setup`, install AI plugins, scaffold another renderer, or build the React Native app. PICO CLI 0.6.0 also adds `url launch` for WebApps and removes the original top-level `web` workflow; this wrapper intentionally stays scoped to native device/app diagnostics.

```sh
npm run pico:doctor
npm run pico:devices
npm run pico:install -- --device SERIAL --apk /absolute/app-pico-debug.apk
npm run pico:launch -- --device SERIAL --package com.example.expopico
npm run pico:capture -- --device SERIAL --package com.example.expopico --out /absolute/pico-run
```

Append `--dry-run` to inspect the exact commands. Install replaces the selected package's existing APK. Capture writes device JSON, the last 1,000 package log lines and a screenshot. Commands require an explicit device; logs can contain app data, so review capture files before sharing. Doctor returns a failing exit code when CLI JSON reports `tool_status: FAILED`, even when the underlying CLI process exits zero. Its Spatial SDK project checks may be inapplicable to a React Native project: inspect the detailed findings.

Optional profiling uses the separately installed PICO tools (`pico-cli perf doctor check`); consult the [official setup guide](https://developer.picoxr.com/document/pico-cli/quickstart-common/). Emulator success does not establish controller, passthrough or tracking support on hardware.

## Upstream integration and remaining release gates

| Requested change                                          | Included source work                                                                                                                                                    | Native / external follow-up                                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [Viro #526](https://github.com/ReactVision/viro/pull/526) | Navigation proxy, error relay, scene boundary, in-scene HUD/alerts, AR scene root on OpenXR; extended to PICO with capability fallback                                  | Verify scene launch/exit/re-entry, controller placement, projection and recentering on Quest and PICO                                      |
| [Viro #527](https://github.com/ReactVision/viro/pull/527) | Web Studio and component parity; [ViroCore #376](https://github.com/ReactVision/virocore/pull/376) source changes                                                       | Requires the corresponding `@reactvision/viro-web-renderer` changes and a WASM rebuild; that repository was unavailable during integration |
| [Viro #528](https://github.com/ReactVision/viro/pull/528) | iOS deployment declaration, colocation module project registration and public header; [ViroCore #377](https://github.com/ReactVision/virocore/pull/377) Podfile changes | Rebuild custom Moyo native libraries with the upstream CCA dependency; do not overwrite them with upstream prebuilt archives               |

`getCapabilities().planeDetection` reports native source initialization: `null` while pending, `false` without a usable source, `true` after initialization. It does not guarantee that a scan contains planes or that an asynchronous permission request will succeed. Studio keeps content visible with manual placement when capability reporting is absent/unavailable. Confirm denied permissions and an empty room scan on-device.

Before a release, test a real PICO headset's controller profiles, trigger/joystick input, scene push/pop, back/exit, suspend/resume, recentering, passthrough and missing-plane behavior. Repeat Quest lifecycle tests and visionOS startup to protect the shared API. Reconcile iOS deployment targets against rebuilt binary load commands: the imported 15.1 podspec does not prove that an existing ViroKit binary built for 17.6 supports 15.1.

Source integration and tooling alone do not establish binary or hardware
compatibility. Use the release artifact's provenance to identify the Android
pair, and complete the device checks above before claiming hardware support.
