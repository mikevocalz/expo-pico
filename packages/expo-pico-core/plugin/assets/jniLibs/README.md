# Staged native libraries

Binaries copied into a consuming app's `android/app/src/<flavor>/jniLibs/` by
`syncPicoOverlays` (`withPicoOpenXrLoaderOverlay.ts`) at prebuild:

| File                  | Flavors                                          |
| --------------------- | ------------------------------------------------ |
| `libopenxr_loader.so` | `pico`, plus `dual` under `buildVariant: 'dual'` |
| `libviro_renderer.so` | `pico`, `dual` (when present) and `quest`        |

`controller_neutral.glb` (from `../androidAssets/`) follows the renderer into
`src/<flavor>/assets/`. `main` and `mobile` never receive any of them. The
`pickFirsts` rule emitted by `updateOverlayPackaging` in `withPicoGradle.ts`
makes the app's own copy win over the one an AAR ships, per flavor.

The renderer goes to `quest` because it is Viro/OpenXR code: the floor origin
and the controller mesh apply on Quest as well. The loader stays out of
`quest`. Stock `@reactvision/react-viro` 3.0.2 already ships a 16KB-aligned
loader (`PT_LOAD` align `0x4000`) that exports all 43 `xr*` symbols the overlay
renderer imports, and the renderer names it only by soname
(`DT_NEEDED libopenxr_loader.so`).

**`arm64-v8a` only.** PICO ships no 32-bit device, so an `armeabi-v7a` slice
buys zero install coverage — and `scripts/verify-16kb-alignment.py` reads
64-bit ELF only (`--abi` accepts `arm64-v8a` and `x86_64`; a 32-bit file fails
with `expected ELF64 little-endian version 1`), so a 32-bit binary here would
be one nothing in this repo can check. `ndkAbiFilters: false` is a supported
option, so the Gradle ABI filter alone is not a guarantee such a file stays out
of the APK. Staging is restricted at the source, not left to the filter.

## What is committed

Both files below are tracked in git; a clean checkout has them.

| File                            |     Bytes | sha256                                                             | BuildID                                    |
| ------------------------------- | --------: | ------------------------------------------------------------------ | ------------------------------------------ |
| `arm64-v8a/libopenxr_loader.so` | 1 662 344 | `50d699172cac4b5dabe0b02bc2a478d49073411778c11eead1dd0d605211da1e` | `6c806a72052f8e325f1311d217340323edd7db85` |
| `arm64-v8a/libviro_renderer.so` | 7 541 208 | `db5db409faf4e08abe3369dc0131a5cb057cc9c782e4f862673c08e7d654fae8` | `cf54042b1516374574896ea7016df64207b80386` |

Both are stripped, and both pass the 16KB check at `0x4000`:

```bash
./scripts/verify-16kb-alignment.py \
  packages/expo-pico-core/plugin/assets/jniLibs/arm64-v8a/libopenxr_loader.so \
  packages/expo-pico-core/plugin/assets/jniLibs/arm64-v8a/libviro_renderer.so
```

## `libopenxr_loader.so` — Khronos 1.1.62

Always overlaid when `xrMode !== 'mobile'` and `openXrLoaderOverlay` is on.

PICO OS / Android 14+ refuse to load a `.so` whose `PT_LOAD` segments are
4KB-aligned. The loader bundled by renderers is typically the older 4KB build,
and the failure is silent at install time and a native-load error at runtime.
This copy is 16KB-aligned.

- Source: `org.khronos.openxr:openxr_loader_for_android:1.1.62` (Maven Central)
- Licence: Apache-2.0

## `libviro_renderer.so` — PICO interaction profiles

**Opt-in.** Only overlaid when `viroRendererOverlay: true`, which defaults to
`false`.

Stock `@reactvision/react-viro` binds exactly one controller interaction
profile:

```
/interaction_profiles/oculus/touch_controller
```

PICO Sense controllers advertise `/interaction_profiles/bytedance/pico4_controller`
(and `…/pico_neo3_controller`). OpenXR does not surface a controller whose
profile the application never binds, so on PICO stock Viro has no controller,
no pointer ray, and no controller-driven input — regardless of what the scene
declares. `<ViroController>` renders, but there is nothing bound underneath it.

- Licence: MIT (`@reactvision/react-viro` — Viro Media, Viro Community,
  ReactVision). Modified build; attribution retained.
- Adds roughly 7MB to the published package.

### Provenance

Built from mikevocalz/virocore `main` at `f9304078` (PRs #103, #104 and #105) with
`./gradlew :viroreact:assembleRelease`; the file is the arm64-v8a
`libviro_renderer.so` from `viroreact-release.aar`. Built without the private
ReactVisionCCA headers, so ReactVision cloud anchors are compiled out
(`RVCCA_AVAILABLE=0`), the same as the renderer in the `viro` fork.

It exports every `Java_*` symbol of the stock 3.0.2 renderer (607 here, 589
in stock, none missing), so it runs under the stock `react_viro` Java. Over
stock it adds the floor-origin ladder (LOCAL_FLOOR, then STAGE-emulated, then
eye) defaulting to Floor on PICO and Meta runtimes, the PICO `bytedance`
interaction profiles, Meta VR Glasses gaze-and-pinch select, and runtime
controller models: on Meta it loads the runtime's own controller meshes through
`XR_FB_render_model`, and falls back to the neutral mesh
(`controller_neutral.glb`) only where the runtime supplies no model.

It binds the `/interaction_profiles/ext/hand_interaction_ext` profile, so on a
hands-only headset (Meta VR Glasses) hand pinch and aim reach the app; the
earlier path without `_ext` was rejected by the runtime.

It decodes `KHR_texture_basisu` (KTX2, Basis Universal UASTC/ETC1S with Zstd)
in glTF, so Meta's Touch Plus controller models render with their textures:
ASTC 4x4 where the GPU supports it, ETC2 otherwise. The transcoder is
BinomialLLC/basis_universal `v1_60` (Apache-2.0) with its Zstd decoder (BSD-3).

`XR_FB_render_model` needs Meta's RENDER_MODEL permission. While the overlay is
staged into `quest`, `withQuestRenderModel` adds
`<uses-permission android:name="com.oculus.permission.RENDER_MODEL"/>` and
`<uses-feature android:name="com.oculus.feature.RENDER_MODEL" android:required="false"/>`
to `app/src/quest/AndroidManifest.xml`, and removes them when the overlay is
off. PICO has no such extension, so the pico, dual, mobile and main manifests
never get them.

### Replacing it

```bash
# from an APK built against the patched renderer
unzip -o -q <app>.apk 'lib/arm64-v8a/libviro_renderer.so' -d /tmp/viro

# must list the bytedance profiles
strings -a /tmp/viro/lib/arm64-v8a/libviro_renderer.so | grep interaction_profiles/

# must be 16KB-aligned
./scripts/verify-16kb-alignment.py /tmp/viro/lib/arm64-v8a/libviro_renderer.so

cp /tmp/viro/lib/arm64-v8a/libviro_renderer.so \
   packages/expo-pico-core/plugin/assets/jniLibs/arm64-v8a/
```

Then update the table above with the new size, sha256 and BuildID.

### Removal condition

This exists only because upstream lacks PICO interaction profiles. When
ReactVision ships them, delete this binary, drop the `viroRendererOverlay`
option, and return `withPicoOpenXrLoaderOverlay` to the loader alone. Nothing
else in the family depends on it.

The durable fix is upstream: the bytedance interaction-profile bindings in
Viro's OpenXR input layer. A PR there retires this file for everyone.
