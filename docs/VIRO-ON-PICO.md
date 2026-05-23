# Viro on PICO compatibility report

Status: **WORKING — `xrCreateInstance` succeeds on Pico 4 Ultra (B3110), Pico's MR plugin initializes the immersive session (`xrInitializeMRServicePlugin`, `xrUserRegister`, `xrCreateEffectBuffer`).**

The hours of debugging detailed below — virocore C++ patches, Khronos OpenXR permissions, broker `<queries>`, runtime API-version A/B tests, intent-filter categories — were red herrings. The single line that actually unblocked Pico OpenXR was a one-line manifest meta-data declaration we missed because Pico's official `OpenXR_Demos` repo has it as the only Pico-specific addition:

```xml
<application>
  <meta-data android:name="pvr.app.type" android:value="vr"/>
</application>
```

Pico's runtime checks this meta-data inside `xrCreateInstance`. If it's missing, the call returns `XR_ERROR_VALIDATION_FAILURE` (`XrResult=-1`) with no further explanation in logcat.

Source: [picoxr/OpenXR_Demos/app/src/main/AndroidManifest.xml](https://github.com/picoxr/OpenXR_Demos/blob/main/app/src/main/AndroidManifest.xml).

`withPicoOpenXrLoader` (in this package) now injects this meta-data alongside the OpenXR loader linkage. The virocore C++ patches and full diagnostic trail are kept below for posterity and because the patched diagnostic logging (`xrCreateInstance failed: XrResult=N`) was what proved this was a validation failure and not something else.

Audience: developers running `@reactvision/react-viro` (Quest renderer) on PICO 4 / 4 Ultra / Swan hardware via the `expo-pico-core` plumbing path.

This is the record of what does and doesn't work, what the fixes are, and what's still broken at the virocore native layer.

## TL;DR

- **What works:** Viro JS loads, the bridge initialises, `ViroMaterials.createMaterials(...)` succeeds (`VRTMaterialManager lookup: FOUND` in JS), the OpenXR loader chain runs through `xrInitializeLoaderKHR` and successfully loads PICO's `APxrRuntime` from `/vendor/etc/openxr/1/active_runtime.json`.
- **What doesn't:** `xrCreateInstance` returns failure on PICO. The virocore C++ macro discards the real `XrResult` and Viro then dereferences a null `XrInstance`, segfaulting the entire app (`Fatal signal 11 (SEGV_MAPERR)`). No scene ever renders.
- **What we ship as fix:** Two things — a config plugin (`withPicoOpenXrLoader`, in this package) that closes the manifest-level gap so Viro's own `quest` flavor manifest carries the OpenXR loader linkage Pico requires, and a virocore source patch (in `expo-pico/patches/virocore/`) that surfaces the real `XrResult` and makes `XR_KHR_android_create_instance` optional. The source patch lets you build a corrected `libviro_renderer.so` and bundle it into the AAR.

## What we tried, what each step did

The test app used `@reactvision/react-viro@2.55.0` rendering a trivial scene (cube + sphere + ground + lights) via `<ViroVRSceneNavigator>`, on Pico B3110 (Pico 4 Ultra), Expo SDK 56 preview, RN 0.85.3, New Architecture on.

### 1. Default behaviour

The Viro config plugin (`xRMode: ['AR', 'QUEST']`) generates a Quest-flavor manifest at `android/app/src/quest/AndroidManifest.xml`. On a Pico headset, when JS mounts `<ViroXRSceneNavigator>` / `<ViroVRSceneNavigator>`, the native side instantiates `ViroViewOpenXR`. That class calls into virocore's `VROSceneRendererOpenXR::initOpenXR()`. The OpenXR loader then tries to find a runtime:

```text
I/OpenXR-Loader: getActiveRuntimeCursor: content://org.khronos.openxr.runtime_broker/...
W/OpenXR-Loader: Null cursor when querying installable content resolver.
W/OpenXR-Loader: SecurityException querying system content resolver:
    Permission Denial ... requires org.khronos.openxr.permission.OPENXR_SYSTEM
E/OpenXR-Loader: Could access neither the installable nor system runtime broker.
```

The runtime broker query fails because the app doesn't declare the Khronos OpenXR permissions or the broker `<provider>` `<queries>` entry. The loader then falls back to `/vendor/etc/openxr/1/active_runtime.json` and successfully loads Pico's `APxrRuntime`:

```text
I/OpenXR-Loader: RuntimeManifestFile::CreateIfValid - loading /vendor/etc/openxr/1/active_runtime.json
E/APxrRuntime: Java_com_pico_xr_openxr_1runtime_DriverLoader_nativeGetProcAddr: InitializeLoaderKHR!
E/APxrRuntime: Java_com_pico_xr_openxr_1runtime_DriverLoader_nativeGetProcAddr: NegotiateLoaderRuntimeInterface!
I/OpenXR-Loader: LoadRuntime succeeded using interface version 1 and OpenXR API version 1.1
```

But the next call still fails:

```text
E/OpenXR-Loader: LoaderInstance::CreateInstance chained CreateInstance call failed
E/OpenXR-Loader: xrCreateInstance failed
E/VRORendererOpenXR: OpenXR fatal at VROSceneRendererOpenXR.cpp:277 result=-1 expr: xrCreateInstance(...)
E/VRORendererOpenXR: initOpenXR() failed — Quest renderer will not function
F/libc: Fatal signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0x40
```

### 2. Adding the OpenXR loader linkage in the manifest

Adding three things to the **main** AndroidManifest (so they propagate into the merged manifest for the `quest` flavor too):

```xml
<uses-permission android:name="org.khronos.openxr.permission.OPENXR"/>
<uses-permission android:name="org.khronos.openxr.permission.OPENXR_SYSTEM"/>

<queries>
  <provider android:authorities="org.khronos.openxr.runtime_broker;org.khronos.openxr.system_runtime_broker"/>
</queries>

<application>
  <uses-native-library android:name="libopenxr_loader.so" android:required="false"/>
</application>
```

After this the loader no longer hits the SecurityException — it now resolves the broker directly. But `xrCreateInstance` still fails the same way. The manifest gap was real (and worth closing for any future Pico-specific code path) but wasn't the underlying issue.

This is exactly what `withPicoOpenXrLoader` (see *Usage* below) does as a config plugin so it survives `expo prebuild --clean`.

### 3. Why `xrCreateInstance` fails

The required extension list in virocore is just two standard Khronos extensions:

```cpp
static const char *const kRequiredExtensions[] = {
    XR_KHR_OPENGL_ES_ENABLE_EXTENSION_NAME,
    XR_KHR_ANDROID_CREATE_INSTANCE_EXTENSION_NAME,
};
```

The optionals (`XR_FB_*`, `XR_EXT_hand_tracking`) are filtered against `xrEnumerateInstanceExtensionProperties` and only included when actually advertised by the runtime — so they are **not** the cause of failure.

The two suspects that remain:

  a. `XR_KHR_ANDROID_CREATE_INSTANCE` — Pico's enumeration may or may not expose this on every firmware revision. When the extension is enabled but the runtime doesn't recognise it, `xrCreateInstance` returns `XR_ERROR_EXTENSION_NOT_PRESENT`.

  b. `XrInstanceCreateInfoAndroidKHR` chained in `createInfo.next` — even when the extension is recognised, PICO Swan's runtime is stricter than Meta's about the JavaVM / Activity references in the struct. If virocore's reflection on `ActivityThread.mActivities` returns the wrong Activity (which happens when the view is mounted inside an Expo dev-launcher activity instead of MainActivity), the createInstance call rejects with `XR_ERROR_VALIDATION_FAILURE`.

Either way the actual `XrResult` is what we need — and Viro's code discards it via `XR_RETURN_FALSE(xrCreateInstance(...))`, turning a meaningful error code into just `bool false`. Then the macro returns from the caller without setting `_instance`, the rendering thread keeps running and dereferences the null instance:

```text
F/libc: Fatal signal 11 (SEGV_MAPERR), fault addr 0x40 in ect2.digivision
```

### 4. The virocore source patch (proposed)

`expo-pico/patches/virocore/VROSceneRendererOpenXR.pico-compat.patch` does three things:

1. **Logs the real `XrResult`.** Replaces `XR_RETURN_FALSE(xrCreateInstance(...))` with an explicit `XrResult` capture + `ALOGE` of the numeric code. Cross-reference against `openxr.h`'s `XrResult` enum to identify the exact failure.
2. **Splits required from soft-required.** `XR_KHR_OPENGL_ES_ENABLE_EXTENSION_NAME` stays in the hard-required list. `XR_KHR_ANDROID_CREATE_INSTANCE_EXTENSION_NAME` moves to a soft-required list that is added to `enabledExtensionNames` only when the runtime advertises it.
3. **Conditionally chains `XrInstanceCreateInfoAndroidKHR`.** Only sets `createInfo.next = &androidInfo` when `XR_KHR_android_create_instance` is actually in `enabledExtensionNames`. Otherwise leaves `createInfo.next = nullptr` so the runtime uses whatever JavaVM / Activity pairing `xrInitializeLoaderKHR` already established.

Apply the patch, rebuild `sharedCode-release.aar`, drop the new `libviro_renderer.so` into the consumer's `node_modules/@reactvision/react-viro/android/viro_renderer/viro_renderer-release.aar`, and `bun run quest`. The new ALOGE line tells us which `XrResult` Pico actually returns — that's the actionable signal to either close the loop or escalate to ReactVision / Pico developer support.

## Usage — config plugin

```ts
// app.config.ts (or app.json)
import { withPicoOpenXrLoader } from 'expo-pico-core/plugin/viro';

export default {
  expo: {
    plugins: [
      [
        '@reactvision/react-viro',
        {
          android: { xRMode: ['AR', 'QUEST'] },
        },
      ],
      // Add after Viro so the merged manifest carries both Viro's quest-flavor
      // entries and the OpenXR Khronos linkage Pico needs.
      withPicoOpenXrLoader,
    ],
  },
};
```

That's all the JS-side change needed. The plugin is idempotent — re-running `expo prebuild --clean` won't duplicate entries.

## Usage — virocore patch

Until ReactVision merges the upstream fix:

```bash
# 1. Build the patched virocore once
git clone https://github.com/ReactVision/virocore.git
cd virocore
git apply /path/to/expo-pico/patches/virocore/VROSceneRendererOpenXR.pico-compat.patch
cd android
./gradlew :sharedCode:assembleRelease
# Output: sharedCode/build/outputs/aar/sharedCode-release.aar

# 2. In your consumer app, replace the AAR shipped in node_modules
cp sharedCode/build/outputs/aar/sharedCode-release.aar \
  /path/to/app/node_modules/@reactvision/react-viro/android/viro_renderer/viro_renderer-release.aar

# 3. Persist via bun patch so it survives reinstalls
cd /path/to/app
bun patch @reactvision/react-viro
# ... copy the AAR into the patch dir if bun doesn't auto-include it ...
bun patch --commit 'node_modules/@reactvision/react-viro'

# 4. Rebuild
bun run quest
```

After the rebuild, you'll see one of:

- `xrCreateInstance OK` — instance created, scene proceeds to render (if so, the rest of the Pico path is already covered by `expo-pico-core`).
- `xrCreateInstance failed: XrResult=N (androidCreateInstanceAvailable=...)` — now we have the actual error code. Map `N` against `openxr.h` and either iterate on the patch or file a ticket with ReactVision quoting the exact code.

## What end-to-end testing on Pico 4 Ultra (B3110) actually showed

After applying both the config plugin and the virocore patch and rebuilding, the diagnostic logging surfaced:

```
E VRORendererOpenXR: xrCreateInstance failed: XrResult=-1 (androidCreateInstanceAvailable=1, enabledExtensionCount=5)
E VRORendererOpenXR: initOpenXR() failed — Quest renderer will not function
E VRORendererOpenXR: eglMakeCurrent failed on render thread: 0x3008
```

`XrResult=-1` is `XR_ERROR_VALIDATION_FAILURE`. The app **no longer crashes** (no SIGSEGV — the patched code returns cleanly). But Pico's `libopenxr_forwardloader.so` rejects instance creation at a layer the app can't see into.

A/B testing ruled out several plausible suspects:

| Suspect | Verdict | Test |
|---|---|---|
| Missing extensions | ❌ not it | `enabledExtensionCount=5`, all accepted; the optional `XR_FB_*` extensions are already filtered against `xrEnumerateInstanceExtensionProperties` |
| `XR_KHR_android_create_instance` not enumerated | ❌ not it | `androidCreateInstanceAvailable=1` — Pico DOES expose the extension |
| Missing Khronos OpenXR permissions | ❌ not it | Adding `OPENXR` + `OPENXR_SYSTEM` + the broker `<queries>` only silenced the runtime-broker-permission warning; same `XrResult=-1` afterward |
| `XrInstanceCreateInfoAndroidKHR` chain malformed | ❌ not it | Forcing `createInfo.next = nullptr` (skipping the chain entirely) returns the same `XrResult=-1` |
| `apiVersion` mismatch (1.1.38 too new) | ❌ not it | Dropping to `XR_API_VERSION_1_0` returns the same `XrResult=-1` |
| Activity launcher categories | ❌ not it | Adding `org.khronos.openxr.intent.category.IMMERSIVE_HMD` and `com.pico.intent.category.VR` intent-filters to `MainActivity` doesn't change the outcome |
| `xrInitializeLoaderKHR` failed | ❌ not it | Pico's `APxrRuntime` logs `InitializeLoaderKHR!` + `NegotiateLoaderRuntimeInterface!` successfully before createInstance is called |

What remains:

- **Pico Platform SDK preflight.** Pico's runtime may require the host app to call `com.pvr.platform.sdk.PlatformSDK.Initialize(appId, appKey)` (or the Unity-style `CoreService.Initialize`) BEFORE `xrCreateInstance` — and reject createInstance otherwise. `expo-pico-core`'s `PicoPlatformSdkDetector` reports whether the SDK class is on the classpath; `expo-pico-account` exposes the JS API to call init. Pairing those packages with Viro and calling init before mounting `<ViroVRSceneNavigator>` is the next hypothesis worth testing.
- **Pico package allowlist / signature.** Pico's forwardloader may only permit instance creation from packages signed with a known dev/test key, or pre-registered against an `appId` via the Pico developer console. Side-loaded debug builds with `DEMO_APP_ID` could be silently denied.
- **Undocumented `XR_PICO_*` extension that gates createInstance.** Less likely (the loader would normally log unrecognised extension names), but possible if the requirement is *the absence* of certain Meta-only ones in the request — though our enumeration check should already prevent that.

## Recommended next step (and where the trail goes cold for app-side debugging)

Open a Pico developer support ticket quoting the captured diagnostics:

```
Hardware: Pico 4 Ultra (B3110)
PicoOS: <result of `adb shell getprop ro.build.version.incremental`>
Runtime: com.pico.xr.openxr_runtime / libopenxr_forwardloader.so
OpenXR loader negotiated: API version 1.1, interface 1
xrInitializeLoaderKHR: returned XR_SUCCESS
xrCreateInstance: returned XR_ERROR_VALIDATION_FAILURE (-1)
  applicationName: ViroReact
  engineName: ViroRenderer
  apiVersion: 1.1.38 (also tested 1.0.38 — same result)
  enabledExtensionCount: 5
  enabledExtensions: XR_KHR_opengl_es_enable, XR_KHR_android_create_instance,
                     XR_EXT_hand_tracking, XR_FB_passthrough, XR_FB_display_refresh_rate
  next chain: XrInstanceCreateInfoAndroidKHR with applicationVM + applicationActivity
              (also tested next=nullptr — same result)

Manifest declares: OPENXR + OPENXR_SYSTEM permissions, runtime-broker provider
  <queries> entry, libopenxr_loader.so as uses-native-library required=false,
  IMMERSIVE_HMD + com.pico.intent.category.VR on MainActivity.

Asking: what is the runtime checking inside xrCreateInstance that validates
the request before any Pico-specific log is emitted? (Forwardloader rejects
with no message beyond "LoaderInstance::CreateInstance chained CreateInstance
call failed".)
```

If Pico support confirms a required SDK preflight call, that's a clean integration path — wire `expo-pico-account.initializePlatformSdk(...)` into the app lifecycle before `<ViroVRSceneNavigator>` mounts.

Without that signal, the trail is cold from the app side. The closed forwardloader binary is the wall.

## Known limitations even after both fixes

- **Pico Spatial intent category.** Viro's `quest` flavor manifest registers `.VRActivity` under `com.oculus.intent.category.VR`. Pico's launcher uses `com.pico.intent.category.VR` (and the Khronos standard `org.khronos.openxr.intent.category.IMMERSIVE_HMD`). To launch the app in Pico's immersive container, an additional activity-alias or category needs to be declared on `.VRActivity`. `expo-pico-core`'s `withPicoLauncherActivity` already does this for the Pico flavor; pairing the two plugins makes the merged manifest correct.
- **Fabric / New Architecture prop setters.** Viro 2.55.0 logs `ViewManagerPropertyUpdater: Could not find generated setter for class com.viromedia.bridge.component.VRT*Manager` for every Viro view. JS props (`position`, `materials`, `passthroughEnabled`, etc.) do not propagate to the native scene in some configurations. This is an upstream Viro Fabric codegen gap and not addressable from `expo-pico-core`. Track at the `@reactvision/react-viro` repo.
- **The non-immersive `<ViroSceneNavigator>` works on Pico without any of this.** If you only need 3D content as a 2D panel (no OpenXR session, no passthrough), just use `<ViroSceneNavigator>` and the standard Pico launcher categories. The OpenXR + Quest path is only needed for true immersive rendering.

## See also

- [`packages/expo-pico-core/plugin/src/viro/withPicoOpenXrLoader.ts`](../packages/expo-pico-core/plugin/src/viro/withPicoOpenXrLoader.ts) — config plugin source.
- [`patches/virocore/VROSceneRendererOpenXR.pico-compat.patch`](../patches/virocore/VROSceneRendererOpenXR.pico-compat.patch) — virocore C++ patch.
- [`docs/MIGRATING-FROM-VIRO.md`](MIGRATING-FROM-VIRO.md) — overall renderer-keep-or-swap decision tree.
