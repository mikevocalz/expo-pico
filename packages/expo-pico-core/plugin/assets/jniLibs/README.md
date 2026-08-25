# Staged native libraries

Binaries overlaid into a consuming app's `android/app/src/main/jniLibs/` by
`withPicoOpenXrLoaderOverlay` at prebuild. Gradle's `pickFirst` (added by
`withPicoQuestFlavor`) makes the app's own copy win over the one an AAR ships.

Verify any binary here with:

```bash
./scripts/verify-16kb-alignment.py packages/expo-pico-core/plugin/assets/jniLibs/arm64-v8a/<lib>.so
```

## `libopenxr_loader.so` — Khronos 1.1.62

Always overlaid when `xrMode !== 'mobile'`.

PICO OS / Android 14+ refuse to load a `.so` whose `PT_LOAD` segments are
4KB-aligned. The loader bundled by renderers is typically the older 4KB build,
and the failure is silent at install time and a native-load error at runtime.
This copy is 16KB-aligned.

- Source: `org.khronos.openxr:openxr_loader_for_android:1.1.62` (Maven Central)
- Licence: Apache-2.0
- ABIs: `arm64-v8a`, `armeabi-v7a`

## `libviro_renderer.so` — PICO interaction profiles

**Opt-in.** Only overlaid when `viroRendererOverlay: true`. Not present in a
clean checkout — see "Staging" below.

Stock `@reactvision/react-viro` binds exactly one OpenXR interaction profile:

```
/interaction_profiles/oculus/touch_controller
```

PICO Sense controllers advertise `/interaction_profiles/bytedance/pico4_controller`
and `…/pico_neo3_controller`. OpenXR does not surface a controller whose profile
the application never binds, so on PICO stock Viro has no controller, no pointer
ray, and no controller-driven input — regardless of what the scene declares.
`<ViroController>` renders, but there is nothing bound underneath it.

The overlaid build binds all three, so one binary serves PICO and Quest. This is
the change the project's own `virocore` fork carried as commit `a6fdd571`,
"PICO compat: OpenXR scene-renderer + multi-profile controller bindings".

- Licence: MIT (`@reactvision/react-viro` — Viro Media, Viro Community,
  ReactVision). Modified build; attribution retained.
- ABI: `arm64-v8a` only. PICO ships no 32-bit device, and carrying an unused
  `armeabi-v7a` copy would add several MB to every install for nothing.
- Adds roughly 7MB to the published package.

### Staging

The binary is not committed by default. Extract it from a build that has the
bindings and confirm before use:

```bash
# from an APK built against the patched renderer
unzip -o -q <app>.apk 'lib/arm64-v8a/libviro_renderer.so' -d /tmp/viro

# must list the two bytedance profiles
strings /tmp/viro/lib/arm64-v8a/libviro_renderer.so | grep interaction_profiles/

# must be 16KB-aligned
./scripts/verify-16kb-alignment.py /tmp/viro/lib/arm64-v8a/libviro_renderer.so

cp /tmp/viro/lib/arm64-v8a/libviro_renderer.so \
   packages/expo-pico-core/plugin/assets/jniLibs/arm64-v8a/
```

### Removal condition

This exists only because upstream lacks PICO interaction profiles. When
ReactVision ships them, delete this binary, drop the `viroRendererOverlay`
option, and return `withPicoOpenXrLoaderOverlay` to the loader alone. Nothing
else in the family depends on it.

The durable fix is upstream: three interaction-profile bindings in Viro's
OpenXR input layer. A PR there retires this file for everyone.
