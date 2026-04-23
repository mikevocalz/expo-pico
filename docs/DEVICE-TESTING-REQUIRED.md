# Device testing required

Running inventory of changes that landed in the `expo-pico` repo without real-hardware validation. Every item here is install-safe (mis-named manifest keys are silently ignored by the Android installer; mis-wired Gradle deps fail cleanly at `yarn install` time), but consumers building against these surfaces should run the specific test listed below on a real PICO device before relying on the behavior in production.

This doc is the running "we shipped it; someone still has to prove it works" list. When a row gets a device pass, strike it through (or delete the row outright) and add a note to the affected package's README.

## Format

Each row has:

- **Item** — what was shipped.
- **Phase** — which phase landed it.
- **Test procedure** — the exact steps that confirm the behavior.
- **Affected packages** — who depends on the outcome.
- **Risk if wrong** — what breaks silently if the keys / wiring are off.

## Phase I — controller input declarations

| Item | Test procedure | Affected packages | Risk if wrong |
| --- | --- | --- | --- |
| `pico.hardware.controller` feature + `com.picovr.permission.CONTROLLER` permission | Build a PICO-flavor APK with `picoSenseController: true`. `aapt dump xmltree <apk> AndroidManifest.xml \| grep -E 'controller'` — confirm both entries present. Launch on PICO 4 or 4 Ultra and verify `PackageManager.hasSystemFeature("pico.hardware.controller")` returns `true`. | `expo-pico-core` | Feature / permission is silently ignored. No crash; controller input still works through standard Android gamepad APIs. Re-label the constants if the canonical PICO names surface in docs. |
| `pico.hardware.motiontracker` feature + `com.picovr.permission.MOTION_TRACKER` permission | Build with `motionTracker: true`. Pair a PICO Motion Tracker dongle. Verify the dongle is discoverable from the app (typically via PICO's tracker SDK — not yet bridged by `expo-pico-*`). Also verify whether `android.permission.USB_HOST` is needed; if it is, file an issue so we add it to the plugin. | `expo-pico-core` | Tracker dongle may not pair without the real permission. Install still succeeds. |
| `pico.hardware.controller.haptic` feature | Build with `controllerHaptics: true`. Call into PICO's controller haptics API (via `VibrationEffect` or PICO's own haptics SDK). Verify actuator fires. | `expo-pico-core` | Haptics silently no-op. |

## Phase L — sibling Gradle migration

| Item | Test procedure | Affected packages | Risk if wrong |
| --- | --- | --- | --- |
| `implementation project(':expo-pico-core')` added to each sibling's `android/build.gradle` | Run `cd example && npx expo prebuild --clean && ./gradlew :app:assemblePicoDebug`. Confirm build succeeds. Inspect `example/android/settings.gradle` and verify `expo-pico-core` is included as a Gradle subproject by the Expo autolinking output. | All 11 siblings | Gradle may fail to resolve `project(':expo-pico-core')` if Expo Modules autolinking's project-naming convention differs from the assumed `:expo-pico-core`. Fallback: revert the `implementation` line in the affected sibling; the sibling keeps working via its existing inline `Class.forName` probe which does not need the cross-module reference. |
| `AccountUtils.getPlatformSdkVersion()` delegating to `PicoPlatformSdkDetector.readVersion()` (canary) | Install `expo-pico-account` + `expo-pico-core` in a fresh app. Build a PICO flavor APK. Call `expo-pico-account`'s `getAccountSdkVersion()` at runtime — when the PICO Platform SDK AAR is absent, it should return `"unavailable"`; when the AAR is present, it should return the SDK's `VERSION_NAME`. | `expo-pico-account` | If the import fails at compile time, only account breaks. Other siblings still use their inline probes. Canary: if this works for account, we can migrate the other 10 siblings in a follow-up. |

## Earlier phases

### Phase A — launcher contract

| Item | Test procedure |
| --- | --- |
| `pvr.app.type=vr` meta-data appears in the merged manifest | `aapt dump xmltree <apk> AndroidManifest.xml \| grep pvr.app.type` |
| OpenXR `IMMERSIVE_HMD` category on `.MainActivity` launcher intent-filter | Same aapt dump; grep for `IMMERSIVE_HMD` |
| `com.pico.intent.category.VR` (and legacy `com.picovr.intent.category.VR`) categories land | Same aapt dump |
| `<queries>` block with `com.pico.os.systemui` + `com.pico.platform` | Same aapt dump; confirm under the `<manifest>` root |
| APK enumerates as immersive in PICO launcher | Install on PICO 4 / 4 Ultra / Swan; confirm the app appears in the VR / immersive section, not 2D apps |

### Phase B — Platform SDK identity

| Item | Test procedure |
| --- | --- |
| `com.pico.loginpaysdk.UnityAuthInterface` + `…PicoSDKBrowser` activities land in merged manifest | `aapt dump xmltree <apk> \| grep loginpaysdk` |
| `pico_app_id` / `pico_app_key` string resources land | Decompile APK or inspect `android/app/build/intermediates/merged_res/` after Gradle build |
| `PICO_HAS_PLATFORM_IDENTITY` BuildConfig field reflects identity presence | `getPicoRuntimeInfo().hasPlatformIdentity` on a real device |

### Phase C / D — hardware capabilities

| Item | Test procedure |
| --- | --- |
| Each capability's `uses-feature` + permission lands with `required="false"` | `aapt dump xmltree <apk>` per capability |
| `com.pico.refreshRates` meta-data reaches the PICO compositor | Device inspection — run app in 90 Hz / 120 Hz mode, confirm via PICO developer tools or system UI |
| `pico.hardware.eyetracking` (etc.) actually flips `PackageManager.hasSystemFeature(...)` on hardware that supports it | Runtime call on PICO 4 Pro / Enterprise with eye tracking |
| `volume` spatial mode plays correctly with PICO OS 6 launcher | Launch app under `spatialMode: 'volume'` |

### Phase E — OpenXR loader + ABI filter

| Item | Test procedure |
| --- | --- |
| `<uses-native-library android:name="libopenxr_loader.so"/>` reaches merged manifest | `aapt dump xmltree <apk> \| grep libopenxr_loader` |
| `ndk { abiFilters 'arm64-v8a' }` applied to the pico flavor | `aapt dump badging <apk> \| grep native-code` — should show `arm64-v8a` only |
| OpenXR loader actually loads at app boot | `System.loadLibrary("openxr_loader")` succeeds without `UnsatisfiedLinkError` |
| Babylon React Native composes cleanly with `expo-pico-core` | Install both, run a Babylon scene on PICO hardware, confirm the immersive session initializes |

### Phase F — runtime diagnostics

| Item | Test procedure |
| --- | --- |
| `PicoRuntimeCapabilities` async functions return PackageManager data correctly | Call `getDeclaredFeatures()` / `getDeclaredPermissions()` at runtime; compare against merged manifest contents |
| `getPicoDiagnostics()` produces correct findings on a real device | Install with intentional misconfig (e.g. `appType: '2d'` + `xrMode: 'pico-os6'`); confirm `appType.hidden-launcher` finding surfaces |

### Phase J — SDK reflection detection

| Item | Test procedure |
| --- | --- |
| `PicoPlatformSdkDetector.probeAny(...)` actually resolves PICO Platform SDK classes when the AAR is on the classpath | Drop the real PICO Platform SDK AAR into `android/app/libs/`. Build + install. Confirm `isPlatformSdkPresent()` returns `true` and `getPlatformSdkProbe()` flips the right surfaces to `true`. |
| `PicoPlatformSdkDetector.readVersion()` reads `com.pvr.platform.sdk.BuildConfig.VERSION_NAME` | Same setup; confirm version string surfaces in `PicoRuntimeInfo.platformSdkVersion` |

### Phase N — example glTF

| Item | Test procedure |
| --- | --- |
| `scripts/download-demo-model.js` successfully fetches BrainStem.glb from the pinned Khronos SHA | `cd example && yarn install` on a fresh checkout; verify `example/assets/models/pico-demo.glb` materializes |
| `GltfModel.tsx` animation mixer plays BrainStem's baked clip | Run example on any Android device; confirm the brain stem model animates, not a torus-knot |

## How to contribute a pass

1. Run the test on real hardware.
2. Open a PR editing this file — strike through the row or delete it, and add a one-line note to the affected package's README under "Validated behavior".
3. Include device model, OS version, build variant, and date in the note.

## Why this isn't a blocker

Every item here is install-safe:

- Mis-named manifest keys are silently ignored by Android's installer. The APK still installs; the app still runs. Only the specific feature's runtime path is affected.
- Mis-wired Gradle cross-module deps fail at `yarn install` / `gradlew assemble` time with a clear error. Consumers know immediately.
- Speculative reflection probes return `false` when they miss. Siblings degrade to their existing inline probes without user-visible breakage.

The PR landed in a `230-tests-green` state and the build pipeline (lint + typecheck + test + pack) is clean. Device validation closes the last mile — but the repo itself is publishable today with these items listed here as follow-ups.
