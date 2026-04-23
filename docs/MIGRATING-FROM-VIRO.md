# Migrating from ReactVision/Viro (Quest / OVR_MOBILE) to expo-pico

Audience: developers with an Expo app currently using [`@reactvision/react-viro`](https://github.com/ReactVision/viro) on its Quest (`OVR_MOBILE`) path who want to ship the same app on PICO 4 / 4 Ultra / Swan.

This guide is **not** a 1:1 port. Viro's native surface (`<ViroScene>`, `<ViroNode>`, `<ViroSphere>`, etc.) is a scene graph; `expo-pico` is platform plumbing. Your scene graph keeps working — the port is about which config plugin sets up the Android native project and which launcher contract the APK enumerates under. Rendering code is unchanged.

If you want to keep Viro for rendering, you can: `expo-pico-core` only touches config / manifest / Gradle, never rendering. See [Option A](#option-a-keep-viro-for-rendering-add-expo-pico-core-for-pico-plumbing) below.

If you're willing to swap renderers (Viro has been community-maintained since 2023), [`@react-three/fiber/native`](https://github.com/pmndrs/react-three-fiber) + [`expo-gl`](https://github.com/expo/expo/tree/main/packages/expo-gl) or [`@babylonjs/react-native`](https://github.com/BabylonJS/BabylonReactNative) are both well-maintained and work with this repo. See [Option B](#option-b-swap-viros-scene-graph-for-react-three-fiber-or-babylon).

## Conceptual mapping

| Concern                               | Viro (Quest)                                                             | `expo-pico-core`                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Top-level plugin                      | `withViro`                                                               | `expo-pico-core` (plugin registered in `plugins` array of `app.config.ts`)                                          |
| Native package registration target    | `ReactViroPackage(ViroPlatform.OVR_MOBILE)`                             | `PicoCorePackage(PicoXRPlatform.PICO_OS6)` or `…PICO_SWAN`                                                         |
| Platform-mode option                  | `android.xRMode: ['OVR_MOBILE']`                                        | `xrMode: 'pico-os6'` or `'pico-swan'`                                                                              |
| New-Architecture check                | warning-only soft check                                                  | warning-only soft check (same pattern — `withPicoNewArchCheck`)                                                     |
| Launcher contract                     | not emitted                                                              | `pvr.app.type` + OpenXR `IMMERSIVE_HMD` + `com.pico.intent.category.VR` + `<queries>` (Phase A)                    |
| Platform SDK identity                 | not emitted                                                              | `pico_app_id` / `pico_app_key` string resources + login/browser activities (Phase B)                                |
| Hardware capability features          | `handTracking`, `passthrough` booleans                                   | Same flags + eye / face / body / foveation / refresh rates / boundary / sceneMesh (Phase C + D)                     |
| NDK ABI filter                        | none                                                                     | `ndk { abiFilters 'arm64-v8a' }` on pico flavor (Phase E, default on)                                               |
| OpenXR loader declaration             | none (consumer responsibility)                                           | `<uses-native-library android:name="libopenxr_loader.so"/>` (Phase E, default on)                                   |
| Runtime SDK detection                 | none                                                                     | `PicoPlatformSdkDetector` reflection probes (Phase J) — `getPlatformSdkProbe()` returns per-surface presence         |
| Prebuild diagnostics                  | `WarningAggregator` soft new-arch check                                  | 7-check `withPicoDiagnostics` + standalone `expo-pico-doctor` CLI (Phase E + G)                                     |
| Runtime diagnostics                   | none                                                                     | `getPicoDiagnostics()` returns structured findings + Platform SDK probe + `formatDiagnostics` (Phase F)             |
| Rendering                             | Viro's own native scene graph                                            | renderer-agnostic (plugin never touches rendering code)                                                             |

See [ARCHITECTURE §15–§22](../ARCHITECTURE.md) for the design behind each row.

## Option A — keep Viro for rendering, add `expo-pico-core` for PICO plumbing

Works when your scene graph is complex and you don't want to re-author it in another renderer. Viro's Quest runtime won't activate on PICO hardware (Oculus-specific), but Viro's AR/GVR paths will still run against PICO's underlying Android GL surface.

### 1. Add `expo-pico-core` alongside Viro

```bash
yarn add expo-pico-core
```

### 2. Update `app.config.ts`

Keep Viro in the plugins array; add `expo-pico-core` **before** it so the PICO flavor manifest / launcher categories land first and Viro's additions merge on top:

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
        'expo-pico-core',
        {
          xrMode: 'pico-os6',
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

Plugin ordering rule: **flavor-manifest-writing plugins first**. `expo-pico-core` writes the PICO flavor manifest. Viro adds top-level manifest entries that merge onto it. Reversing the order means Viro's plugin runs before the flavor exists and emits its entries only into the main manifest — you lose the pico-only scoping.

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

- **`missingDimensionStrategy`**: `expo-pico-core` introduces a `device` flavor dimension. If Viro or any other plugin declares its own dimension, add `missingDimensionStrategy` entries in `android/app/build.gradle` for cross-dimension resolution. See [ARCHITECTURE §6](../ARCHITECTURE.md#6-build-flavor-strategy).
- **Viro's `<queries>`**: if Viro adds its own `<queries>` entries, they'll merge with `expo-pico-core`'s (`com.pico.os.systemui` + `com.pico.platform`). Both sets coexist cleanly.
- **Viro's sensor permissions**: Viro declares camera, accelerometer, gyroscope, sensor features. `expo-pico-core` doesn't touch these — they survive merge.

## Option B — swap Viro's scene graph for react-three-fiber or Babylon

Works when you want active renderer maintenance + the modern React ecosystem. Viro's `<ViroScene>` / `<ViroNode>` JSX doesn't port 1:1 — you rewrite scene code. But the scene graph concepts (transforms, materials, animations, lights) map cleanly.

### 1. Remove Viro

```bash
yarn remove @reactvision/react-viro
```

Delete the Viro plugin entry from `app.config.ts`. Delete any `<ViroARSceneNavigator>` / `<ViroVRSceneNavigator>` entrypoints from your app — the renderer now mounts into a plain React Native view hierarchy.

### 2. Add a renderer

**Babylon React Native** (what the example app uses — 2.x line):

```bash
yarn add @babylonjs/react-native@^2.0.3 @babylonjs/core@^9.0.0 @babylonjs/loaders@^9.0.0
```

Depending on your React Native version, you may also need a matching iOS/Android native variant package (the 1.x line shipped these as `@babylonjs/react-native-iosandroid-0-74` / `-0-75` / etc.; the 2.x line's install step may have changed). Follow the [Babylon React Native install docs](https://github.com/BabylonJS/BabylonReactNative#installation) for the exact variant your RN version requires.

**react-three-fiber + expo-gl + three**:

```bash
yarn add @react-three/fiber expo-gl expo-asset three
yarn add -D @types/three
```

Both compose cleanly with `expo-pico-core`'s launcher contract. The example's current `example/src/scene/PicoSceneRoot.tsx` + `GltfModel.tsx` is a copy-pasteable Babylon reference. See the [FAQ](./FAQ.md#5-can-i-use-babylon-react-native-instead-of-react-three-fiber) for plugin-ordering rules.

### 3. Port scene code

Rough semantic mapping — not a codemod, but a starting point:

| Viro                                       | react-three-fiber                                           |
| ------------------------------------------ | ----------------------------------------------------------- |
| `<ViroARSceneNavigator>`                   | `<Canvas>` (from `@react-three/fiber/native`)               |
| `<ViroScene>`                              | just the JSX children of `<Canvas>` — there's no explicit scene component |
| `<ViroNode position={[x,y,z]}>`           | `<group position={[x,y,z]}>`                                |
| `<ViroBox materials={…}>`                  | `<mesh><boxGeometry /><meshStandardMaterial /></mesh>`      |
| `<ViroSphere radius={r}>`                  | `<mesh><sphereGeometry args={[r]} /></mesh>`                |
| `<ViroAmbientLight color="#fff" intensity={0.5}>` | `<ambientLight color="#fff" intensity={0.5} />`       |
| `<ViroSpotLight />`                        | `<spotLight />`                                             |
| `ViroMaterials.createMaterials({...})`    | inline material props: `<meshStandardMaterial color={…} metalness={…} />` |
| `ViroAnimations.registerAnimations({...})`| `useFrame` hook or `@react-spring/three` for declarative animations |
| `onClick` on a Viro component              | `onClick` on a `<mesh>` (r3f built-in picker)               |
| `<Viro3DObject source={require(…)}>`      | `useLoader(GLTFLoader, require(…))` + `<primitive object={gltf.scene} />` |
| `<ViroText text="Hello">`                  | `<Text>` from `@react-three/drei` (extra package)           |

### 4. Bridge Viro's data plumbing

Viro-side state (user gaze, controller input, anchor callbacks) typically comes in via JSX event props. r3f / Babylon use hooks.

- Gaze / pointer: r3f's raycaster + `@react-three/fiber`'s `onPointerOver` / `onPointerOut`.
- Controller: Babylon Native exposes an input manager; r3f needs a lightweight controller abstraction (see [`three.xr`](https://threejs.org/docs/#api/en/renderers/webxr/WebXRController) for the pattern — not directly usable on native but conceptually similar).
- Anchors / ARCore: not directly applicable on PICO; use `expo-pico-spatial` (extension seams today) for the PICO-native equivalents.

### 5. Handle what doesn't port

Some Viro-specific features don't have a direct PICO equivalent and need to be deleted or reimplemented:

- **`<ViroARPlane>` / plane detection via ARCore.** ARCore's plane detection doesn't run on PICO (Google's AR runtime isn't supported). The PICO equivalent is scene understanding — declare `sceneUnderstanding: true` in `expo-pico-core` and use `expo-pico-spatial` (extension seam today).
- **Cloud anchors / geospatial anchors.** Google-specific; no PICO equivalent ships today.
- **`<ViroPortal>`.** Viro's portal component has no direct port; implement with r3f's `StencilMaterial` + render-to-texture if you need it.

## Explicit: what Viro's Quest plumbing does that `expo-pico-core` deliberately does not

From the audit in [ARCHITECTURE §15.5](../ARCHITECTURE.md#155-what-is-intentionally-not-copied-from-quest-support):

- **`OVR_MOBILE` enum reused for Swan.** A distinct `PICO_SWAN` value in a PICO-owned enum is correct; shoehorning Swan into `OVR_MOBILE` would carry over Oculus SDK assumptions that don't apply.
- **`settings.gradle` unconditional subproject inclusion.** Viro's helper has no idempotency check; re-prebuilding duplicates `include` lines. `withPicoSettingsGradle` is marker-guarded + opt-in.
- **Oculus-specific manifest categories.** `com.oculus.intent.category.VR`, `oculus.software.handtracking`, `com.oculus.supportedDevices`, `com.oculus.permission.USE_ANCHOR_API` — none of these are valid on PICO OS. Equivalent entries live under `com.pico.*` / `pico.hardware.*` / `pico.software.*`.
- **Per-mode package accumulation.** Viro registers one `ReactViroPackage` per active `xRMode` entry. PICO Swan / PICO OS 6 are mutually exclusive at boot; exactly one `PicoCorePackage` is registered.
- **Gradle classpath overrides.** Viro rewrites the AGP classpath in the root `build.gradle`. The Expo SDK 55 toolchain ships the right AGP; we never force it.
- **Forcing `minSdkVersion` 24.** Viro's `withViroProjectBuildGradle` hardcodes min SDK 24. PICO's floor is higher (32 for OS 6, 33 for Swan). The plugin sets the floor per-flavor, not project-wide.

## Diagnostic gates

After porting, run the PICO-specific gates before submitting to the store:

```bash
# Phase G: lint the plugin config without building
npx expo-pico-doctor --fail-on-warning

# Phase E + J: runtime diagnostics should report cleanly on a real device
# (add to app boot for development builds; remove for production release)
```

Walk [docs/PRODUCTION-READINESS.md](./PRODUCTION-READINESS.md) before the first PICO Store submission. §3 (manifest contract) is particularly important — it's where Viro-era leftovers tend to hide.

## Questions

See [docs/FAQ.md](./FAQ.md) and the [issues tracker](https://github.com/mikevocalz/expo-pico/issues). The FAQ's Viro comparison row in question 4 is deliberately a pointer into this guide — start there and drill in.
