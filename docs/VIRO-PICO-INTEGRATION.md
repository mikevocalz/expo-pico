# Viro + Expo-PICO integration

PICO is a native Viro platform, alongside Quest and visionOS. The three repositories have distinct responsibilities:

| Layer | Repository | Responsibility |
| --- | --- | --- |
| Renderer | [mikevocalz/virocore](https://github.com/mikevocalz/virocore/tree/pico-support) | OpenXR sessions, PICO controller profiles, rendering, passthrough, initialized native capabilities |
| React API | [mikevocalz/viro](https://github.com/mikevocalz/viro) | `ViroXRSceneNavigator`, shared immersive activity, scene navigation, Studio, native bridge |
| Expo platform | [mikevocalz/expo-pico](https://github.com/mikevocalz/expo-pico) | `pico` flavor, PICO activity metadata, native package registration, platform services and diagnostics |
| Quest comparison | [expo-horizon-core](https://github.com/software-mansion-labs/expo-horizon/tree/main/expo-horizon-core) | `quest` flavor and Horizon platform configuration |

`PICO` and `QUEST` use Viro's existing OpenXR renderer and shared `VRActivity` / `VRQuestScene` entry. That component name remains for compatibility. visionOS retains its native immersive-space path and a plain `ViroScene` root. PICO CLI operates around this stack; it does not replace Viro with a Spatial SDK or Unity project.

## Configure the coordinated fork build

Use a package built from the matching Viro and ViroCore changes. The public package currently pinned in `example/package.json` is not evidence that these native changes are included. Keep the canonical package name `@reactvision/react-viro` when packaging this fork: the Android plugin resolves its native projects under that name.

```ts
plugins: [
  ['@reactvision/react-viro', { android: { xRMode: ['PICO'] } }],
  ['@expo-pico/core', {
    buildVariant: 'pico',
    xrMode: 'pico-os5',
    appType: 'mr',
    passthrough: true,
    // For the rebuilt, verified ViroCore AAR:
    openXrLoaderOverlay: false,
    viroRendererOverlay: false,
  }],
]
```

If shipping Quest too, keep the Horizon plugin and use Viro `xRMode: ['QUEST', 'PICO']`. Expo-PICO and Horizon share the `device` flavor dimension. PICO falls back to Horizon's `mobile` library variant, Quest falls back to Expo-PICO's `mobile` variant, and `dual` tries `pico` then `mobile` for dependencies. This uses [Gradle matchingFallbacks](https://developer.android.com/build/build-variants#resolve_matching_errors); `missingDimensionStrategy` is for an absent dimension.

Let Viro register `VRQuestScene`. Mount `ViroXRSceneNavigator` from the panel to set the scene intent and launch the immersive activity. Do not replace its registration with `registerImmersiveScene` when using this navigator. That helper remains available for custom roots. Launching `.VRActivity` directly from a cold app bypasses intent setup.

PICO-only configuration now generates `VRActivity.kt` without Quest metadata or Quest SDK/ABI overrides. Expo-PICO supplies the PICO contract in `app/src/pico/AndroidManifest.xml` (also `src/dual` when selected). An existing manually edited `VRActivity.kt` is preserved; inspect it when adopting a newer template.

Legacy loader overrides remain enabled by default for compatibility. Renderer overrides remain opt-in. Both are now confined to `src/pico` / `src/dual`, including controller assets and variant packaging rules. Prebuild tracks file hashes, updates same-size content, and removes known obsolete overrides. It stops with the affected path if a custom override cannot be attributed to the plugin. Disable both overrides when validating the new paired native build, so a staged older `.so` cannot mask it. `openXrLoaderDeclaration` is a separate manifest setting.

## Build and verify the native pair

1. Build ViroCore from its integration branch using `./scripts/build-pico-aar.sh --out /absolute/artifacts`. The script verifies arm64 ELF alignment and writes a JSON record of the commit, dirty state and SHA-256.
2. Stage its renderer AAR into Viro's `android/viro_renderer/viro_renderer-release.aar`. Rebuild `:viro_bridge:assembleRelease` in Viro's Android project, and stage its output in `android/react_viro/react_viro-release.aar`. The Java capability API and JNI symbol must come from the same native build.
3. Build/package the Viro fork with its required web-renderer dependency, install that package into the consuming Expo app, and run Android prebuild. Build `:app:assemblePicoDebug` with `-PreactNativeArchitectures=arm64-v8a`.
4. Check the resulting APK, not only the input AAR:

```sh
python3 scripts/verify-16kb-alignment.py /absolute/app-pico-debug.apk
zipalign -v -c -P 16 4 /absolute/app-pico-debug.apk
```

The Python gate rejects missing arm64 libraries, malformed ELF headers and any under-aligned load segment. ZIP alignment is a separate check. [Android's 16KB guidance](https://developer.android.com/guide/practices/page-sizes) concerns devices using 16KB pages; Android/PICO OS version alone does not establish the page size.

## PICO CLI 0.5.0

The [PICO CLI announcement](https://developer.picoxr.com/blog/pico-cli-is-now-live/) adds device, deployment and diagnostic workflows. These scripts use verified 0.5.0 command syntax and pin the npm package. Node 18+ and npm are required; CLI execution may download that version on first use. They do not run `setup`, install AI plugins, scaffold another renderer, or build the React Native app.

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

| Requested change | Included source work | Native / external follow-up |
| --- | --- | --- |
| [Viro #526](https://github.com/ReactVision/viro/pull/526) | Navigation proxy, error relay, scene boundary, in-scene HUD/alerts, AR scene root on OpenXR; extended to PICO with capability fallback | Verify scene launch/exit/re-entry, controller placement, projection and recentering on Quest and PICO |
| [Viro #527](https://github.com/ReactVision/viro/pull/527) | Web Studio and component parity; [ViroCore #376](https://github.com/ReactVision/virocore/pull/376) source changes | Requires the corresponding `@reactvision/viro-web-renderer` changes and a WASM rebuild; that repository was unavailable during integration |
| [Viro #528](https://github.com/ReactVision/viro/pull/528) | iOS deployment declaration, colocation module project registration and public header; [ViroCore #377](https://github.com/ReactVision/virocore/pull/377) Podfile changes | Rebuild custom Moyo native libraries with the upstream CCA dependency; do not overwrite them with upstream prebuilt archives |

`getCapabilities().planeDetection` reports native source initialization: `null` while pending, `false` without a usable source, `true` after initialization. It does not guarantee that a scan contains planes or that an asynchronous permission request will succeed. Studio keeps content visible with manual placement when capability reporting is absent/unavailable. Confirm denied permissions and an empty room scan on-device.

Before a release, test a real PICO headset's controller profiles, trigger/joystick input, scene push/pop, back/exit, suspend/resume, recentering, passthrough and missing-plane behavior. Repeat Quest lifecycle tests and visionOS startup to protect the shared API. Reconcile iOS deployment targets against rebuilt binary load commands: the imported 15.1 podspec does not prove that an existing ViroKit binary built for 17.6 supports 15.1.

These branches contain source integration and tooling. They do not contain rebuilt Android, WASM, iOS or visionOS binaries, and hardware validation remains required.
