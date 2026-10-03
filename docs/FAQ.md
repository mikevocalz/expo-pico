# FAQ

Questions that keep coming up. If yours isn't here, open a [GitHub issue](https://github.com/mikevocalz/expo-pico/issues).

## 1. Why Expo config plugins instead of a bare React Native library?

Because PICO-specific support needs project-level mutations (product flavors, launcher categories, BuildConfig fields, PICO-flavor manifest, Platform SDK identity resources) that a runtime library can't do from JS. Config plugins are Expo's native path for making those mutations survive `expo prebuild --clean`.

This works for projects on the managed workflow and on bare RN. The plugin runs at prebuild time; the sibling runtime modules are Expo Modules, looked up at runtime through `resolveHybridObject()`, which wraps `requireOptionalNativeModule()`. The two are complementary, not alternatives — a config plugin cannot expose native APIs to JS, and a native module cannot rewrite your Gradle files.

## 2. Why is this Android-only?

PICO hardware runs Android. There's no iOS PICO runtime. Every sibling's `android/` directory has real code; no sibling ships an `ios/` directory. The `platform: Android` in every README isn't a roadmap item. It's a hard constraint.

## 3. Why require the New Architecture?

The packages target React Native 0.88, and React Native removed the Legacy Architecture in 0.82, so there is no other architecture to run on. `expo-pico-core` still emits a `WarningAggregator` notice when `newArchEnabled: true` is missing (see `withPicoNewArchCheck`), and its MainApplication flag guard extends `ReactNativeNewArchitectureFeatureFlagsDefaults`.

## 4. How is this different from [react-three/viro](https://github.com/ReactVision/viro) or other Quest / MR libraries?

Viro's Quest support uses an `xRMode` axis (`AR | GVR | OVR_MOBILE`) that selects a Meta-specific native runtime. This repo studied that architecture and deliberately rebuilt it for PICO rather than shoehorning PICO into an Oculus-shaped enum:

| Concern                     | Viro (Quest)                                | `expo-pico-core`                                                 |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Native package name         | `ReactViroPackage(ViroPlatform.OVR_MOBILE)` | `PicoCorePackage(PicoXRPlatform.PICO_OS5 \| PICO_SWAN)`          |
| Immersive launcher category | not emitted                                 | `IMMERSIVE_HMD` + `com.pico.intent.category.VR` + legacy PICO VR |
| ABI filter                  | none                                        | `arm64-v8a` on pico flavor only                                  |
| Platform SDK identity       | none                                        | `pico_app_id` / `pico_app_key` / IAP + foreign-region siblings   |
| Runtime SDK detection       | none                                        | `PicoDevice.classPresent()` reflection probes                    |
| Prebuild diagnostics        | limited `WarningAggregator` on new-arch     | 7-check `withPicoDiagnostics` + standalone `expo-pico-doctor`    |
| Renderer                    | bundles its own OpenGL scene graph          | renderer-agnostic                                                |

For a step-by-step porting guide (including a JSX-component mapping table for the renderer swap), see [docs/MIGRATING-FROM-VIRO.md](./MIGRATING-FROM-VIRO.md).

## 5. Which renderer should I use?

`@reactvision/react-viro`. That's what the example app uses, and the only renderer we run end-to-end CI against. The plugin touches only config / manifest / Gradle (never rendering code), so other OpenXR-loader renderers also work:

- `@reactvision/react-viro` (example app; Khronos BrainStem glTF loads through `<Viro3DObject>`; ships immersive on PICO and Meta Quest from one APK). The example pins the stock npm release — no fork and no patches.
- Unity-as-a-Library
- Any custom renderer that binds to the system OpenXR loader

List `expo-pico-core` before `@reactvision/react-viro` in `app.config.ts`'s plugins array so the flavor manifest lands first. Viro's plugin additions then merge on top.

## 6. Why is `expo-pico-core`'s version 0.1.x but the first release goes to 1.0.0?

Changesets cascades peer-dep changes as major bumps per strict semver (hardcoded in `@changesets/assemble-release-plan`). The `expo-pico-*` siblings declare `peerDependencies: { "@expo-pico/core": ">=0.1.0" }`, so when core bumps minor, every sibling is forced to bump major. With the `linked` policy pulling everyone to the same version, the first release lands at 1.0.0 across all 12 packages.

The plugin option API itself is strictly additive. Every option defaults off or tracks an existing option. Configs written for `0.1.x` keep working unchanged on `1.0.0`. The major version reflects install-visible manifest / Gradle changes (launcher contract, ABI filter, `<uses-native-library>`), not a breaking API.

## 7. Do I need the PICO Platform SDK AAR to use this?

No for the basics: `expo-pico-core` alone gets you flavor manifests, launcher categories, BuildConfig fields, runtime device detection, and the full prebuild + runtime diagnostics, all without any PICO-proprietary binary.

No for the modern PPS-backed siblings either: account, IAP, notifications, rooms, RTC, leaderboards, achievements, storage, social, subscription. PICO publishes the Platform Service SDK (PPS) as public Maven artifacts — `com.pico.pps:platform-service-{auth,iap,friend,social,achievement,leaderboard,push,entitlement,compliance,sport,speech}:1.0.0` — at `https://artifact.bytedance.com/repository/Volcengine/`. The `withPicoGradle` plugin registers the repo and the dependencies automatically, so on a `picoDebug` build the PPS classes (`com.pico.pps.sdk.iap.IapClient`, `PicoSignInClient`, `LeaderboardClient`, `PicoSocialClient`, etc.) land in the APK and the reflection probe flips each sibling to live with no further action. These siblings only report `SERVICE_UNAVAILABLE` when the active flavor is `mobile`, the host is not PICO hardware, or Gradle was offline at prebuild time.

Yes, but only for a narrower set of surfaces that still ride the **legacy PVR-prefixed SDKs** (not on public Maven):

- `expo-pico-core`'s programmatic `setPassthrough()` / `PXR_Plugin` haptics — legacy PICO Platform SDK 3.x (`com.pvr.platform:platform-sdk:3.2.0`)
- `expo-pico-spatial` (anchors, scene mesh, eye/face/body tracking) — legacy PICO Spatial SDK 1.x (`com.pvr.spatial:spatial-sdk:1.0.0`)

For those, download the AAR through the PICO Developer Console and drop it into `vendor/pico-sdk/` or `android/app/libs/`. The drop-in path is kept around for these specifically; it is not the path for the modern PPS surfaces.

## 8. How do I check that my app is configured correctly before building?

Run the doctor:

```bash
npx expo-pico-doctor
```

It runs the seven prebuild checks against your `app.config` without touching the Android toolchain. `--fail-on-warning` flips it into a strict CI gate.

## 9. How do I see which SDK surfaces are live at runtime?

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

const probe = await getPlatformSdkProbe();
// { account: true, iap: false, notifications: true, ... }
```

Or open the example app's Diagnostics tab. The `DiagnosticsPanel` renders the probe as a per-surface table with "live" / "seam" labels.

## 10. My `app.config.ts` isn't being picked up by `expo-pico-doctor`.

The doctor uses `@expo/config` to load the project config. On some Expo versions, `skipPlugins: true` returns `plugins: undefined` for `.ts` configs instead of preserving the array.

Workaround: pre-resolve once.

```bash
# In your project root
npx expo config --type prebuild --json > /tmp/resolved.json
node -e 'const c=require("/tmp/resolved.json");require("fs").writeFileSync("/tmp/app.config.json",JSON.stringify({expo:c}))'
npx expo-pico-doctor --project /tmp
```

We deliberately don't bundle `esbuild-register` or similar to transpile `.ts` configs in-process. Adding ~10 MB of build tooling to the CLI isn't worth closing this edge case when a one-line shell command works.

## 11. What happens if I build the mobile flavor on a PICO device (or vice-versa)?

- Mobile flavor on PICO hardware. The app runs, but appears in the PICO launcher's 2D-apps section, not the immersive section. No Platform SDK surfaces are wired. The diagnostics panel shows a `mobile-on-pico-device` warning. Useful for rapid iteration on UI that doesn't need XR.
- Pico flavor on non-PICO hardware. The app installs (thanks to `android:required="false"` on every `uses-feature`), renders 2D content, and runs the PICO core module's no-op runtime init. PPS classes are present on the classpath (Gradle resolved them from public Maven at build time), but their runtime services aren't installed on the host, so the PPS-backed siblings still return `SERVICE_UNAVAILABLE`. Diagnostics shows `build-device-mismatch`. Useful for screenshot generation, unit tests, and CI.

Both are intentional. Neither flavor crashes on the other hardware type.

## 12. Can I ship just a few of the sibling packages without installing all 12?

Yes. `expo-pico-core` is the only required package. Add siblings à la carte. Each one only pulls in its own native module and adds ~30 KB to the final APK. The sibling packages have zero cross-dependencies; installing `expo-pico-iap` doesn't force you to install `expo-pico-account`.

The probe reports every surface, but surfaces whose package isn't installed will always show `false`. That's correct.

## 13. How do I version my own app against `expo-pico-core`?

Your app's `package.json` should declare:

```json
{
  "dependencies": {
    "@expo-pico/core": "^1.0.0"
  }
}
```

(Assuming 1.0.0 has been published; use the latest version shown on [npm](https://www.npmjs.com/package/expo-pico-core).)

The plugin option API is additive, so minor and patch updates are safe. We signal any breaking change with a major bump and call it out in the CHANGELOG.

## 14. My app opens straight into XR, and I want it to start as a 2D panel.

Set `appType: '2d'` and put the immersive categories on your VR activity instead
of the launcher.

`appType` drives two different things that are easy to conflate:

- the `pvr.app.type` meta-data, which PICO's runtime reads **inside
  `xrCreateInstance`** — a runtime check, nothing to do with launching
- the immersive launcher categories (`com.pico.intent.category.VR`,
  `com.picovr.intent.category.VR`, `org.khronos.openxr.intent.category.IMMERSIVE_HMD`),
  which is what makes PICO OS enumerate the APK as an immersive app and start it
  in XR

An app that is 2D first and immersive on demand — a tutoring app, a store, a
media browser where XR is one screen — wants the first and not the second. Use
`appType: '2d'`, then add the categories to the activity that hosts the
immersive session (Viro's generated `VRActivity`, or your own) in your own config
plugin. Keep `pvr.app.type` reading `vr` or the session will not open when the
user does enter XR.

If you write both, mind the order: config plugin mods compose as a stack, so the
plugin that writes `pvr.app.type=vr` must be listed BEFORE `@expo-pico/core` in
order to run AFTER it.

## 15. I paired this with `@reactvision/react-viro` and the OpenXR broker

`<queries>` entry vanished from my manifest.

`withViroAndroid` does `contents.manifest.queries = [...]` — an assignment, not
a push — so whatever wrote a `<queries>` child earlier is discarded.

List `withPicoOpenXrLoader` (and any plugin of your own that writes `<queries>`)
BEFORE `@reactvision/react-viro` in the `plugins` array. Expo composes mods as a
stack: each runs its action then calls the previously registered mod, so **the
last plugin listed edits the file first and the first plugin listed edits it
last**. Listed after Viro, your entry is written and then thrown away.

The tell is a manifest that has `pvr.app.type`, both
`org.khronos.openxr.permission.*` lines and the `uses-native-library` line — all
of which Viro does not touch — while `<queries>` holds only ARCore.

## 16. Nothing renders in the headset, but the session looks fine.

Work down this list before suspecting your scene. Each of these fails silently
and the symptom is identical: a black or near-black eye buffer.

1. **`pvr.app.type` missing** → `xrCreateInstance` returns
   `XR_ERROR_VALIDATION_FAILURE` with nothing in logcat. With no instance, a
   Viro `VRActivity` falls back to drawing its React root as a flat 2D window —
   so "my 2D app is floating in the XR scene" is this, not a layout bug.
2. **4KB-aligned `libopenxr_loader.so`** → PICO OS 5 on Android 14+ refuses it.
   `expo-pico-core` ships a 16KB-aligned overlay; confirm one is in `jniLibs`
   and check with `scripts/verify-16kb-alignment.py <apk>`.
3. **Wrong scene root** → a fully-virtual scene uses `ViroScene`. `ViroARScene`
   is the mixed-reality root and its plane/anchor path is Meta's `XR_FB_scene`,
   which PICO does not have.
4. **You are looking at the wrong Activity.** `am start -n <pkg>/.MainActivity`
   restores the 2D route; it does not open your immersive screen. Deep-link the
   route instead, then confirm with
   `adb shell dumpsys activity activities | grep topResumedActivity`.

And one discipline worth stating outright: `topResumedActivity` tells you WHICH
activity you are looking at. It does not tell you that anything rendered. Only
the frame does.

## 17. Contributing?

See [CONTRIBUTING.md](../CONTRIBUTING.md). Short version:

- Make a changeset (`yarn changeset`) for any user-visible change.
- Run the full local verification block before opening a PR.
- Update per-package README and QUICKSTART when the consumer surface changes.
- Native-behavior PRs need device evidence (model, OS version, build variant) in the PR description.
