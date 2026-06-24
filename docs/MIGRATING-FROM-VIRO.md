# Migrating from ReactVision/Viro (Quest / OVR_MOBILE) to expo-pico

Audience: developers with an Expo app currently using [`@reactvision/react-viro`](https://github.com/ReactVision/viro) on its Quest (`OVR_MOBILE`) path who want to ship the same app on PICO 4 / 4 Ultra / Swan.

This guide is not a 1:1 port. Viro's native surface (`<ViroScene>`, `<ViroNode>`, `<ViroSphere>`, etc.) is a scene graph; `expo-pico` is platform plumbing. Your scene graph keeps working. The port is about which config plugin sets up the Android native project and which launcher contract the APK enumerates under. Rendering code is unchanged.

Viro is the renderer used by this repo's example app and is actively maintained by [ReactVision](https://github.com/ReactVision/viro) (community fork since 2023). `expo-pico-core` only touches config / manifest / Gradle, never rendering. Keep your `<ViroScene>` / `<ViroNode>` JSX. See [Option A](#option-a-keep-viro-for-rendering-add-expo-pico-core-for-pico-plumbing) below.

## Conceptual mapping

| Concern                               | Viro (Quest)                                                             | `expo-pico-core`                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Top-level plugin                      | `withViro`                                                               | `expo-pico-core` (plugin registered in `plugins` array of `app.config.ts`)                                          |
| Native package registration target    | `ReactViroPackage(ViroPlatform.OVR_MOBILE)`                             | `PicoCorePackage(PicoXRPlatform.PICO_OS5)` or `…PICO_SWAN`                                                         |
| Platform-mode option                  | `android.xRMode: ['OVR_MOBILE']`                                        | `xrMode: 'pico-os5'` or `'pico-swan'`                                                                              |
| New-Architecture check                | warning-only soft check                                                  | warning-only soft check (same pattern: `withPicoNewArchCheck`)                                                      |
| Launcher contract                     | not emitted                                                              | `pvr.app.type` + OpenXR `IMMERSIVE_HMD` + `com.pico.intent.category.VR` + `<queries>` (Phase A)                    |
| Platform SDK identity                 | not emitted                                                              | `pico_app_id` / `pico_app_key` string resources + login/browser activities (Phase B)                                |
| Hardware capability features          | `handTracking`, `passthrough` booleans                                   | Same flags plus eye / face / body / foveation / refresh rates / boundary / sceneMesh (Phase C + D)                  |
| NDK ABI filter                        | none                                                                     | `ndk { abiFilters 'arm64-v8a' }` on pico flavor (Phase E, default on)                                               |
| OpenXR loader declaration             | none (consumer responsibility)                                           | `<uses-native-library android:name="libopenxr_loader.so"/>` (Phase E, default on)                                   |
| Runtime SDK detection                 | none                                                                     | `PicoPlatformSdkDetector` reflection probes (Phase J): `getPlatformSdkProbe()` returns per-surface presence         |
| Prebuild diagnostics                  | `WarningAggregator` soft new-arch check                                  | 7-check `withPicoDiagnostics` plus standalone `expo-pico-doctor` CLI (Phase E + G)                                  |
| Runtime diagnostics                   | none                                                                     | `getPicoDiagnostics()` returns structured findings plus Platform SDK probe and `formatDiagnostics` (Phase F)        |
| Rendering                             | Viro's own native scene graph                                            | renderer-agnostic (plugin never touches rendering code)                                                             |

## Option A: keep Viro for rendering, add `expo-pico-core` for PICO plumbing

Works when your scene graph is complex and you don't want to re-author it in another renderer. Viro's Quest runtime won't activate on PICO hardware (Oculus-specific), but Viro's AR/GVR paths will still run against PICO's underlying Android GL surface.

### 1. Add `expo-pico-core` alongside Viro

```bash
yarn add expo-pico-core
```

### 2. Update `app.config.ts`

Keep Viro in the plugins array; add `expo-pico-core` before it so the PICO flavor manifest and launcher categories land first and Viro's additions merge on top:

```ts
// app.config.ts
export default {
  expo: {
    name: 'my-xr-app',
    newArchEnabled: true,
    orientation: 'landscape',
    plugins: [
      // NEW — add before viro
      [
        '@expo-pico/core',
        {
          xrMode: 'pico-os5',
          appType: 'vr',
          buildVariant: 'pico',
          platformService: {
            picoAppId: process.env.PICO_PLATFORM_APP_ID,
            picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
          },
          handTracking: true,
          passthrough: true,
        },
      ],

      // EXISTING — your Viro plugin
      [
        '@reactvision/react-viro',
        {
          android: {
            xRMode: ['AR', 'GVR'], // drop 'OVR_MOBILE' when targeting PICO
          },
        },
      ],
    ],
  },
};
```

Plugin ordering rule: flavor-manifest-writing plugins first. `expo-pico-core` writes the PICO flavor manifest. Viro adds top-level manifest entries that merge onto it. Reversing the order means Viro's plugin runs before the flavor exists and emits its entries only into the main manifest, so you lose the pico-only scoping.

### 3. Drop `OVR_MOBILE` from `xRMode`

Viro's `OVR_MOBILE` mode expects Meta's VrApi native libraries on the device. PICO doesn't ship those. Attempting to register `ReactViroPackage(ViroPlatform.OVR_MOBILE)` on a PICO device crashes at bind time. Keep `AR` / `GVR` for phone builds if you need them; PICO immersive enumeration comes from `expo-pico-core`'s launcher contract, not from Viro's xRMode.

### 4. Rebuild

```bash
npx expo prebuild --clean
npx expo run:android --variant picoDebug
```

Inspect the merged manifest if you want to verify the PICO flavor entries landed alongside Viro's:

```bash
aapt dump xmltree android/app/build/outputs/apk/pico/debug/app-pico-debug.apk AndroidManifest.xml \
  | grep -E 'pvr\.app\.type|IMMERSIVE_HMD|viro|ReactViroPackage'
```

### 5. Gotchas

- `missingDimensionStrategy`: `expo-pico-core` introduces a `device` flavor dimension. If Viro or any other plugin declares its own dimension, add `missingDimensionStrategy` entries in `android/app/build.gradle` for cross-dimension resolution.
- Viro's `<queries>`: if Viro adds its own `<queries>` entries, they'll merge with `expo-pico-core`'s (`com.pico.os.systemui` plus `com.pico.platform`). Both sets coexist cleanly.
- Viro's sensor permissions: Viro declares camera, accelerometer, gyroscope, sensor features. `expo-pico-core` doesn't touch these; they survive merge.

## What Viro's Quest plumbing does that `expo-pico-core` deliberately does not

- `OVR_MOBILE` enum reused for Swan. A distinct `PICO_SWAN` value in a PICO-owned enum is correct; shoehorning Swan into `OVR_MOBILE` would carry over Oculus SDK assumptions that don't apply.
- `settings.gradle` unconditional subproject inclusion. Viro's helper has no idempotency check; re-prebuilding duplicates `include` lines. `withPicoSettingsGradle` is marker-guarded and opt-in.
- Oculus-specific manifest categories. `com.oculus.intent.category.VR`, `oculus.software.handtracking`, `com.oculus.supportedDevices`, `com.oculus.permission.USE_ANCHOR_API`: none of these are valid on PICO OS. Equivalent entries live under `com.pico.*` / `pico.hardware.*` / `pico.software.*`.
- Per-mode package accumulation. Viro registers one `ReactViroPackage` per active `xRMode` entry. PICO Swan / PICO OS 6 are mutually exclusive at boot; exactly one `PicoCorePackage` is registered.
- Gradle classpath overrides. Viro rewrites the AGP classpath in the root `build.gradle`. The Expo SDK 56 toolchain ships the right AGP; we never force it.
- Forcing `minSdkVersion` 24. Viro's `withViroProjectBuildGradle` hardcodes min SDK 24. PICO's floor is higher (32 for OS 6, 33 for Swan). The plugin sets the floor per-flavor, not project-wide.

## Diagnostic gates

After porting, run the PICO-specific gates before submitting to the store:

```bash
# Phase G: lint the plugin config without building
npx expo-pico-doctor --fail-on-warning

# Phase E + J: runtime diagnostics should report cleanly on a real device
# (add to app boot for development builds; remove for production release)
```

## Questions

See [docs/FAQ.md](./FAQ.md) and the [issues tracker](https://github.com/mikevocalz/expo-pico/issues). The FAQ's Viro comparison row in question 4 is deliberately a pointer into this guide. Start there and drill in.
