# Production readiness checklist

Single-page pre-ship review. Walks through plugin config, identity, manifest contract, build toolchain, assets, diagnostics, and submission. Every row references the specific phase + doc section that explains the deeper context.

If every row is green, your APK / AAB is ready to submit to the PICO Store. If anything is red, the linked section tells you how to close the gap.

## 1. Plugin config

| Check                                                                                  | Pass criterion                                                                                                             | Verify with                                                                                    |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `expo-pico-core` is listed in `plugins`, **before** any sibling plugins.               | Entry present, ordered first.                                                                                              | `npx expo-pico-doctor` (errors on "plugin not found")                                           |
| `buildVariant` is `'pico'` or `'dual'`.                                                | Writes the PICO flavor manifest + settings.                                                                                | doctor warns `build-variant.ignored-apptype` otherwise                                          |
| `xrMode` matches the hardware target.                                                  | `'pico-swan'` for Swan; `'pico-os6'` for PICO 4 / 4 Ultra / Neo3; `'mobile'` only for 2D companion builds.                   | Cross-reference ARCHITECTURE §15                                                                 |
| `appType` matches the launcher intent.                                                 | `'vr'` for immersive; `'mr'` for passthrough-first; `'2d'` only for companion 2D.                                           | ARCHITECTURE §16                                                                                |
| `newArchEnabled: true` in the top-level Expo config.                                   | New Architecture active.                                                                                                   | doctor warns otherwise                                                                          |

## 2. PICO Platform identity

| Check                                                                                     | Pass criterion                                                                                                                  | Verify with                                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `platformService.picoAppId` + `picoAppKey` populated from env / secrets.                  | Non-empty at build time. Never committed to source control.                                                                     | [EAS.md §2](./EAS.md#2-secrets) + doctor `identity.missing`                         |
| IAP pair (if IAP is used) is **both** `picoMerchantId` + `picoPayKey`, not just one.     | Both set (or neither). Doctor flags partial identity.                                                                           | doctor `iap.partial-identity`                                                      |
| Foreign region pair (`platformService.foreign.*`) populated when shipping globally.       | If you distribute in both CN and Global, each region's app ID/key is set; otherwise foreign object is absent.                   | ARCHITECTURE §17                                                                   |
| Login/browser activities declared in flavor manifest.                                     | Appear in the merged manifest: `com.pico.loginpaysdk.UnityAuthInterface`, `…PicoSDKBrowser`.                                   | `aapt dump xmltree <apk> AndroidManifest.xml \| grep loginpaysdk`                 |

## 3. Manifest contract

| Check                                                                  | Pass criterion                                                                                    | Verify with                                                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `pvr.app.type` meta-data landed.                                       | Value matches `appType`.                                                                          | `aapt dump xmltree <apk> AndroidManifest.xml \| grep pvr.app.type`                     |
| OpenXR `IMMERSIVE_HMD` category on `.MainActivity`.                   | Launcher activity intent-filter carries it.                                                       | `aapt dump xmltree <apk> \| grep IMMERSIVE_HMD`                                        |
| PICO launcher category on `.MainActivity`.                            | `com.pico.intent.category.VR` present. Legacy `com.picovr.intent.category.VR` also emitted by default. | same grep                                                                               |
| `<queries>` block references `com.pico.os.systemui` + `com.pico.platform`. | Both packages enumerated at manifest root.                                                   | `aapt dump xmltree <apk>`                                                                |
| Telephony / SMS permissions removed.                                   | `tools:node="remove"` entries applied.                                                            | ARCHITECTURE §15 constants list                                                         |
| Hardware capability features declared for every surface the app uses.  | `pico.hardware.handtracking`, `pico.hardware.passthrough`, `pico.hardware.eyetracking`, etc. — only those actually used. | ARCHITECTURE §18, doctor `capabilities.ignored-under-mobile`                            |
| `<uses-native-library>` for `libopenxr_loader.so` present.            | Required at `targetSdkVersion ≥ 31`.                                                              | `aapt dump xmltree <apk> \| grep libopenxr_loader`                                     |

## 4. Toolchain + build output

| Check                                                                    | Pass criterion                                                              | Verify with                                                                      |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `ndk { abiFilters 'arm64-v8a' }` applied to the `pico` flavor.           | Only `arm64-v8a` is included; 32-bit slice dropped.                         | `aapt dump badging <apk> \| grep native-code`                                     |
| `minSdkVersion` matches the plugin default for your `xrMode`.            | 32 for `pico-os6`, 33 for `pico-swan` (or explicit override).               | inspect `android/app/build.gradle` after prebuild                                 |
| `targetSdkVersion 34` (or your declared target).                         | Matches plugin option; required for Google / PICO policy compliance.        | `aapt dump badging <apk> \| grep targetSdk`                                      |
| Signing config present for release builds.                               | Keystore generated + stored (typically via `eas credentials`).              | [EAS.md §3](./EAS.md#3-signing)                                                  |

## 5. Runtime diagnostics

Ship with live diagnostics so your QA + support team can surface issues quickly.

| Check                                                                                     | Pass criterion                                                                  | Verify with                                                                    |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `getPicoDiagnostics()` returns `hasError: false` on a real device.                       | No missing required features, no identity errors, no permission gaps.            | Call from app boot; log the report.                                            |
| Phase J `getPlatformSdkProbe()` shows the SDKs you expect to be live as `true`.          | Live siblings match your expected-surface list.                                 | Inspect the example app's DiagnosticsPanel, or log the probe.                  |
| No ungranted runtime-dangerous permissions at feature-use time.                           | `RECORD_AUDIO` for RTC, `POST_NOTIFICATIONS` for notifications, etc.             | App requests permissions at first use, not at boot.                            |

## 6. Assets + size

| Check                                                                         | Pass criterion                                                                  | Verify with                                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| AAB / APK size reasonable for target audience.                                | Typically < 150 MB for initial install; delivered assets via asset packs.       | `unzip -l <aab>` or PICO Developer Console size report         |
| GLB / asset licenses documented.                                              | CC0 / permissive / owned. Attributions included for CC-BY models.               | App "Credits" screen + store listing                           |
| Icons + adaptive icon + splash match PICO Store requirements.                 | PICO 4 icon spec: 512×512 for store; adaptive icon for launcher.                | PICO Developer Console asset requirements                      |

## 7. CI gates

Everything in `docs/release/ci-gates.md` passes. TL;DR:

- `yarn prettier:check`, `yarn lint`, `yarn typecheck`, `yarn test`, `yarn build`, `yarn test:pack`
- `yarn example:prebuild:android`, `yarn example:assemble:mobile`, `yarn example:assemble:pico`
- For stable releases: two-device evidence for `expo-pico-rtc`, `-rooms`, `-social`.

## 8. Submission

See [EAS.md §4](./EAS.md#4-pico-developer-platform).

- Build: `eas build --profile production-pico` (AAB).
- Upload via PICO Developer Console (no `eas submit` yet).
- Release notes, screenshots, ratings submitted.
- Region-specific metadata for CN + Global if applicable.

## 9. Post-submission monitoring

After the app is live, you want early visibility on:

- Crash reports — wire Sentry / Firebase Crashlytics / your crash pipeline.
- Runtime SDK probe drift — if a PICO OS update renames an SDK class, Phase J's probe starts returning `false` for that surface and sibling modules degrade. Monitor `getPlatformSdkProbe()` output in telemetry.
- Permission-grant rates — `permission.ungranted:*` diagnostics in production tell you which permission prompts users are declining.

## Nothing here obsoletes common sense

This checklist covers the PICO-specific plumbing. Standard release hygiene (automated tests, rollback plan, support on-call, user comms, staged rollout) still applies — the same way it would for any Android app.

## Links

- [EAS.md](./EAS.md) — EAS Build + submit integration
- [RELEASING.md](../RELEASING.md) — releasing `expo-pico-*` packages themselves
- [ARCHITECTURE.md](../ARCHITECTURE.md) — full design reference (§1–§22)
- [docs/release/ci-gates.md](./release/ci-gates.md) — per-PR and per-release CI gates
- [docs/release/prerelease-checklist.md](./release/prerelease-checklist.md) — prerelease train prep
