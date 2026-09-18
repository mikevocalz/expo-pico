# Staged native libraries

Binaries copied into a consuming app's `android/app/src/<flavor>/jniLibs/` by
`syncPicoOverlays` (`withPicoOpenXrLoaderOverlay.ts`) at prebuild, for the
`pico` flavor and — under `buildVariant: 'dual'` — `dual` as well. `main`,
`mobile` and `quest` never receive them. The `pickFirsts` rule emitted by
`updateOverlayPackaging` in `withPicoGradle.ts` makes the app's own copy win
over the one an AAR ships.

**`arm64-v8a` only.** PICO ships no 32-bit device, so an `armeabi-v7a` slice
buys zero install coverage — and `scripts/verify-16kb-alignment.py` reads
64-bit ELF only (`--abi` accepts `arm64-v8a` and `x86_64`; a 32-bit file fails
with `expected ELF64 little-endian version 1`), so a 32-bit binary here would
be one nothing in this repo can check. `ndkAbiFilters: false` is a supported
option, so the Gradle ABI filter alone is not a guarantee such a file stays out
of the APK. Staging is restricted at the source, not left to the filter.

## What is committed

Both files below are tracked in git; a clean checkout has them.

| File                                   |      Bytes | sha256                                                             | BuildID                                    |
| -------------------------------------- | ---------: | ------------------------------------------------------------------ | ------------------------------------------ |
| `arm64-v8a/libopenxr_loader.so`        |  1 662 344 | `50d699172cac4b5dabe0b02bc2a478d49073411778c11eead1dd0d605211da1e` | `6c806a72052f8e325f1311d217340323edd7db85` |
| `arm64-v8a/libviro_renderer.so`        |  7 046 480 | `7efd15dcc3e7033266f0de4d52b4e4e3d762f6d64d3a60a6e9db3357568d6e90` | `594d58bcae783ba18161ae25bfb3604a6bfc6de6` |

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

### Provenance: not established

This file's build cannot be traced to a `virocore` commit.

An earlier revision of this README named `a6fdd571` ("PICO compat: OpenXR
scene-renderer + multi-profile controller bindings"). That does not hold up:
`VROInputControllerOpenXR.cpp` at `a6fdd571` calls `suggestForProfile` for
three profiles — `oculus/touch_controller`, `bytedance/pico_neo3_controller`,
`bytedance/pico4_controller` — while the committed binary carries seven
profile strings, including two that appear nowhere in that tree:

```console
$ strings -a arm64-v8a/libviro_renderer.so | grep interaction_profiles/ | sort -u
/interaction_profiles/bytedance/pico4_controller
/interaction_profiles/bytedance/pico4s_controller     <-- not in a6fdd571
/interaction_profiles/bytedance/pico_g3_controller    <-- not in a6fdd571
/interaction_profiles/bytedance/pico_neo3_controller
/interaction_profiles/ext/eye_gaze_interaction
/interaction_profiles/khr/simple_controller
/interaction_profiles/oculus/touch_controller
```

The binary is stripped and its BuildID matches no build this repo can
reproduce, so there is no machine-checkable link back to any source revision.
What *is* checkable is the delta against the published renderer: the same
command over `node_modules/@reactvision/react-viro/android/viro_renderer/viro_renderer-release.aar!jni/arm64-v8a/libviro_renderer.so`
lists only `ext/eye_gaze_interaction` and `oculus/touch_controller`. The four
`bytedance` profiles are what this overlay adds.

Treat the file as an unreproducible vendored artifact until it is rebuilt from
a named commit and this section is replaced with that commit plus the sha256
of its output.

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
