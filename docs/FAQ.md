# FAQ

Questions that keep coming up. If yours isn't here, open a [GitHub issue](https://github.com/mikevocalz/expo-pico/issues).

## 1. Why Expo config plugins instead of a bare React Native library?

Because PICO-specific support needs **project-level mutations** (product flavors, launcher categories, BuildConfig fields, PICO-flavor manifest, Platform SDK identity resources) that a runtime library can't do from JS. Config plugins are Expo's native path for making those mutations survive `expo prebuild --clean`.

This works equally well for projects on the managed workflow and on bare RN that still use Expo Modules — the plugin runs at prebuild time, and the sibling runtime modules use the standard Expo Modules bridge.

## 2. Why is this Android-only?

PICO hardware runs Android. There's no iOS PICO runtime. Every sibling's `android/` directory has real code; no sibling ships an `ios/` directory. The `platform: Android` in every README isn't a roadmap item — it's a hard constraint.

## 3. Why require the New Architecture?

`PicoCorePackage`'s registration shape and several Expo Modules surfaces we rely on (`AsyncFunction` arity, `ModuleDefinition` DSL, the module auto-registration manifest) ship in the New Architecture code path. `expo-pico-core` emits a `WarningAggregator` notice when `newArchEnabled: true` is missing — builds continue but you're on an unsupported path.

Concretely: Platform SDK integrations fail silently on Legacy Architecture because the bridge lookup doesn't find the modules at their expected names.

## 4. How is this different from [react-three/viro](https://github.com/ReactVision/viro) / other Quest / MR libraries?

Viro's Quest support uses an `xRMode` axis (`AR | GVR | OVR_MOBILE`) that selects a Meta-specific native runtime. This repo's Phase S work studied that architecture and deliberately rebuilt it for PICO rather than shoehorning PICO into an Oculus-shaped enum:

| Concern                           | Viro (Quest)                                    | `expo-pico-core`                                                 |
| --------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| Native package name               | `ReactViroPackage(ViroPlatform.OVR_MOBILE)`     | `PicoCorePackage(PicoXRPlatform.PICO_OS6 \| PICO_SWAN)`          |
| Immersive launcher category       | not emitted                                     | `IMMERSIVE_HMD` + `com.pico.intent.category.VR` + legacy PICO VR |
| ABI filter                        | none                                            | `arm64-v8a` on pico flavor only                                  |
| Platform SDK identity             | none                                            | `pico_app_id` / `pico_app_key` / IAP + foreign-region siblings   |
| Runtime SDK detection             | none                                            | Phase J `PicoPlatformSdkDetector` reflection probes              |
| Prebuild diagnostics              | limited `WarningAggregator` on new-arch         | 7-check `withPicoDiagnostics` + standalone `expo-pico-doctor`    |
| Renderer                          | bundles its own OpenGL scene graph              | renderer-agnostic                                                |

See [ARCHITECTURE §15.5](../ARCHITECTURE.md#155-what-is-intentionally-not-copied-from-quest-support) for the full "what we deliberately did not copy from Viro" list, and [docs/MIGRATING-FROM-VIRO.md](./MIGRATING-FROM-VIRO.md) for a step-by-step porting guide (including a JSX-component mapping table for the renderer swap).

## 5. Which renderer should I use?

`@reactvision/react-viro` — that's what the example app uses, and the only renderer we run end-to-end CI against. The plugin touches only config / manifest / Gradle (never rendering code), so other OpenXR-loader renderers also compose cleanly:

- `@reactvision/react-viro` (example app; Khronos BrainStem glTF loads through `<Viro3DObject>`; ships immersive on PICO + Meta Quest from one APK via this repo's `mikevocalz/virocore` fork)
- Unity-as-a-Library
- Any custom renderer that binds to the system OpenXR loader

List `expo-pico-core` **before** `@reactvision/react-viro` in `app.config.ts`'s plugins array so the flavor manifest lands first. Viro's plugin additions then merge on top.

See [ARCHITECTURE §19.6](../ARCHITECTURE.md#196-renderer-compatibility-matrix) for the full matrix and [§19.7](../ARCHITECTURE.md#197-reactvisionviro--integration-notes) for Viro-specific wiring notes.

## 6. Why is `expo-pico-core`'s version 0.1.x but the first release goes to 1.0.0?

Changesets cascades peer-dep changes as major bumps per strict semver (hardcoded in `@changesets/assemble-release-plan`). The `expo-pico-*` siblings declare `peerDependencies: { "@expo-pico/core": ">=0.1.0" }`, so when core bumps minor, every sibling is forced to bump major. With the `linked` policy pulling everyone to the same version, the first release lands at 1.0.0 across all 12 packages.

The **plugin option API itself is strictly additive**. Every Phase A–T option defaults off or tracks an existing option — configs written for `0.1.x` keep working unchanged on `1.0.0`. The major version reflects install-visible manifest / Gradle changes (Phase A launcher contract, Phase E ABI filter, Phase E `<uses-native-library>`), not a breaking API.

## 7. Do I need the PICO Platform SDK AAR to use this?

No for the basics: `expo-pico-core` alone gets you flavor manifests, launcher categories, BuildConfig fields, runtime device detection, and the full Phase F / Phase G diagnostics — all without any PICO-proprietary binary.

Yes for sibling features: account / IAP / notifications / RTC / rooms / leaderboards / achievements / storage / social / subscription. Their bridge methods return `SERVICE_UNAVAILABLE` until the PICO Platform SDK AAR is on the classpath. Phase J reflection probes (`PicoPlatformSdkDetector`) flip them to live automatically when the AAR appears in `android/app/libs/` — no code change in your app.

The SDK AAR is not publicly distributed from a Maven repo (yet). Consumers get it through the PICO Developer Console after registering an app.

## 8. How do I check that my app is configured correctly before building?

Run the doctor:

```bash
npx expo-pico-doctor
```

It runs the seven Phase E checks against your `app.config` without touching the Android toolchain. `--fail-on-warning` flips it into a strict CI gate. See [ARCHITECTURE §21](../ARCHITECTURE.md#21-expo-pico-doctor-cli-phase-g).

## 9. How do I see which SDK surfaces are live at runtime?

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

const probe = await getPlatformSdkProbe();
// { account: true, iap: false, notifications: true, ... }
```

Or open the example app's **Diagnostics** tab — the Phase M `DiagnosticsPanel` renders the probe as a per-surface table with "live" / "seam" labels.

## 10. My `app.config.ts` isn't being picked up by `expo-pico-doctor`.

The doctor uses `@expo/config` to load the project config. On some Expo versions, `skipPlugins: true` returns `plugins: undefined` for `.ts` configs instead of preserving the array.

Workaround — pre-resolve once:

```bash
# In your project root
npx expo config --type prebuild --json > /tmp/resolved.json
node -e 'const c=require("/tmp/resolved.json");require("fs").writeFileSync("/tmp/app.config.json",JSON.stringify({expo:c}))'
npx expo-pico-doctor --project /tmp
```

We deliberately don't bundle `esbuild-register` or similar to transpile `.ts` configs in-process — adding ~10 MB of build tooling to the CLI isn't worth closing this edge case when a one-line shell command works.

## 11. What happens if I build the mobile flavor on a PICO device (or vice-versa)?

- **Mobile flavor on PICO hardware.** The app runs, but appears in the PICO launcher's 2D-apps section, not the immersive section. No Platform SDK surfaces are wired. The diagnostics panel shows a `mobile-on-pico-device` warning. Useful for rapid iteration on UI that doesn't need XR.
- **Pico flavor on non-PICO hardware.** The app installs (thanks to `android:required="false"` on every `uses-feature`), renders 2D content, and runs the PICO core module's no-op runtime init. All Platform SDK calls return `SERVICE_UNAVAILABLE`. Diagnostics shows `build-device-mismatch`. Useful for screenshot generation, unit tests, and CI.

Both are intentional — neither flavor crashes on the other hardware type.

## 12. Can I ship just a few of the sibling packages without installing all 12?

Yes. `expo-pico-core` is the only required package. Add siblings à la carte — each one only pulls in its own native module and adds ~30 KB to the final APK. The sibling packages have zero cross-dependencies; installing `expo-pico-iap` doesn't force you to install `expo-pico-account`.

The Phase J probe reports every surface, but surfaces whose package isn't installed will always show `false` — that's correct.

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

The plugin option API is additive, so minor + patch updates are safe. We signal any breaking change with a major bump and call it out in the CHANGELOG.

## 14. Contributing?

See [CONTRIBUTING.md](../CONTRIBUTING.md). Short version:

- Make a changeset (`yarn changeset`) for any user-visible change.
- Run the full local verification block before opening a PR.
- Update per-package README / ARCHITECTURE / QUICKSTART when the consumer surface changes.
- Native-behavior PRs need device evidence (model, OS version, build variant) in the PR description.
