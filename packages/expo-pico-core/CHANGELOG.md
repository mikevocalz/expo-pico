# @expo-pico/core

## 2.0.0

### Major Changes

- 9787b69: No PICO app ID, no PICO build. Without `picoAppId` (or `platformService.picoAppId`) core adds no `pico` or `dual` flavor, no pico manifest, no `pvr.app.id`, no PICO Platform Service dependencies and no overlays, and prints one info line instead of the identity error. Leave the ID unset (for example `picoAppId: process.env.PICO_APP_ID`) until you want a PICO build; a placeholder such as `1234567` fails prebuild. The build gate that failed `pico`/`dual` builds with an empty ID is gone, and prebuild removes it from an existing `app/build.gradle`.

  Core no longer declares the `quest` flavor or writes anything into it. `metaLayoutSdk`, `storeDeviceTargets`, `questRemovePermissions`, `questRemoveFeatures`, `questExcludeDependencies` and the quest copy of `viroRendererOverlay` moved to the `expo-horizon-core` plugin entry (`github:mikevocalz/expo-pico#release/horizon-core`), which owns the quest flavor for Quest and Meta VR Glasses. Passing one of the first five to `@expo-pico/core` fails prebuild with a message naming the entry they belong on. The Horizon BuildConfig fix for AGP 9 moved with them.

### Minor Changes

- 5cda191: Add Lucide icon meshes for the immersive scene. The Eskiu runtime parses SVG element markup and builds a stroke mesh with round joins and caps. `getIconMesh`, `getLucideIconMesh` and `iconMeshToViroGeometry` return it as `ViroGeometry` props. The bundled set is 10 Lucide icons (ISC). The PICO build now needs eskiuc 0.9.3 or newer for the Eskiu runtime; without it, icon meshes throw `ESKIU_RUNTIME_UNAVAILABLE`.
- 53cc87a: `enterImmersiveScene()` and `hasImmersiveActivity()` find Viro's `.VRActivity` by an `expo.modules.pico.IMMERSIVE_ACTIVITY` meta-data marker the plugin writes, not by its intent filter. The one-launcher-tile rules rename or remove that filter, so the old lookup found nothing and Enter XR fell back to the inline scene on Quest and PICO. Phone builds resolve no immersive activity. The launcher-tile check now ignores `tools:node="remove"` filters, which never reach the merged manifest.

  A placeholder app ID (`1234567`, `your-pico-app-id`, `REPLACE_WITH_PICO_APP_ID` and similar) in `picoAppId`, `platformService.picoAppId` or `platformService.foreign.picoAppId` now fails prebuild with an error naming the field. PICO OS closes an app whose ID is not registered for its package.

- d44e9fb: Meta Horizon OS entries no longer reach the PICO or phone APK. `@reactvision/react-viro` 3.0.2 with `xRMode: ['QUEST', ...]` writes Horizon OS permissions (`com.oculus.permission.*`, `horizonos.permission.*`), features (`com.oculus.feature.PASSTHROUGH`, `oculus.software.*`), `com.oculus.supportedDevices`, and VRActivity's `com.oculus.intent.category.VR` filter and `com.oculus.vr.focusaware` meta-data into the main manifest, and its `viro_renderer` AAR declares the eye-tracking permission and feature. Every flavor merged them. A finalized mod now reads the written main manifest, collects every entry named `com.oculus.*`, `oculus.*`, `horizonos.*` or `com.meta.*`, adds the AAR's two entries, and writes a `tools:node="remove"` marker for each into the pico and dual flavor manifests (with a pico flavor) and the mobile flavor manifest (when a quest flavor exists, created if missing). The quest flavor manifest is not touched. `android.hardware.vr.headtracking` is left alone: the PICO flavor declares it itself.
- e962042: PICO-only permissions and features no longer reach the Quest and mobile APKs. `com.picovr.payment.BILLING` (iap, subscription), `com.picovr.platform.permission.SOCIAL` (rooms, social) and the spatial `pico.software.*` features used to be written to the main AndroidManifest, which every flavor merges. They now go to the pico (and dual) flavor manifest through core's new `withPicoFlavorPermission` / `withPicoFlavorFeature` helpers, and a re-run of prebuild removes copies an older prebuild left in main. Apps with `buildVariant: 'mobile'` have no pico flavor and keep the entries in main. These packages now need `@expo-pico/core` 1.1.0 or newer.
- 905365c: PICO OS 5 window defaults. PICO builds get a translucent main window and a `PicoPanelActivity` with its own `pico.vr.position`, opened at a dp size through `new PicoWindows().createPanelHost()`. The prebuild and a merged-manifest Gradle check fail on a `pico.vr.position` that would reuse another activity's window or make it a popup. The prebuild also moves Viro's `.VRActivity` off `MAIN` so the one-launcher-tile check passes with published `@reactvision/react-viro`. Turn either default off with the `windows` plugin option.
- f304f15: PICO Platform Service SDK moves from 1.0.0 to each artifact's newest stable release on the Volcengine Maven: `platform-service-{auth,achievement,friend,iap,leaderboard,social}` 1.1.2, `platform-service-{push,sport}` 1.1.3, `pps_sdk_base` 1.1.3. `compliance`, `entitlement` and `speech` have never published past 1.0.0 and stay there. Versions are now per artifact (`PPS_SERVICE_VERSIONS` in `ppsArtifacts.ts`); one shared version would have requested coordinates that do not exist. The generated `constraints` block and the project-level resolution pin use the same per-artifact map, and `pps_sdk_base` is forced to 1.1.3 for every service. The 1.1.2 services' POMs name 1.1.2, but `pps_sdk_base` 1.1.2 and 1.1.3 have the same public API. No member the wrapped packages call was removed or changed. `sdkVersion` on each bridge reports the new version.

  An `android/` generated by an earlier version picks up the new pins on the next `npx expo prebuild`; `--clean` is not needed. The plugin now rewrites its PPS dependency block, its `app/libs` block and the project-level resolution pin in place instead of skipping them when their marker exists. `expo-pico-doctor` reports pins under `pps-coordinate-version-skew`, now checked per artifact: a stale line inside the generated block gets "run `npx expo prebuild`", a hand-written one gets "remove it".

  `@expo-pico/app-kit` no longer tells you to declare `com.pico.pps:platform-service-*` yourself or put a PPS AAR in `android/app/libs/`. `expo-pico-core` declares the Maven artifacts, and its `fileTree` excludes PPS AARs by name.

- 110feca: `pvr.app.id` no longer reaches the Quest APK. Core used to write it to the main AndroidManifest so every flavor had it. It now goes to the flavors that can call PICO Platform Services: pico, dual and mobile (`android/app/src/mobile/AndroidManifest.xml`, created if missing). A copy left in main by an older prebuild is removed. A single-variant app (`buildVariant: 'mobile'`) still gets it in main, unless expo-horizon-core adds a quest flavor, in which case it goes to the mobile flavor. The opt-in `withPicoOpenXrLoader` routes `pvr.app.type=vr` the same way and no longer writes it to main. New helper: `withPicoFlavorMetaData`. The meta-data is now also written when only `platformService.picoAppId` is set, matching the `pico_app_id` string resource.
- 16f6c92: New `metaLayoutSdk` option on the `expo-horizon-core` plugin entry links the Meta VR Layout SDK (`@metavr/layout-compat` and `@metavr/layout-window-compat`) into the `quest` flavor only. It writes the MetaVRX BOM and both React Native artifacts as `questImplementation`, keeps the SDK and its `horizonos.permission.MANAGE_APP_VOLUMETRIC_WINDOWS` permission out of every other flavor, gives those flavors empty stand-ins for the two packages the generated `PackageList` creates, and lists the SDK's library projects in `tools:overrideLibrary` so a phone flavor below minSdk 29 still builds. Off by default.
- 32ed3d5: New quest-only options on the `expo-horizon-core` plugin entry: `questRemovePermissions` and `questRemoveFeatures` write `tools:node="remove"` entries into `app/src/quest/AndroidManifest.xml`, and `questExcludeDependencies` excludes `group:module` coordinates from the quest compile and runtime classpaths. Use them for permissions, features and libraries that another package adds to every flavor but the Meta Horizon build never uses. pico, dual, mobile and main are untouched.
- 29c4a8a: New `storeDeviceTargets` option on the `expo-horizon-core` plugin entry writes `com.meta.store.defaultDeviceTargets` into the quest flavor manifest's `<application>`. Meta uses it to set a build's initial Device Targeting in the Developer Dashboard, and `quest3+` covers the Quest 3 family, Meta VR Glasses and future devices. Without the option, a `com.oculus.supportedDevices` list that includes `quest3` or `quest3s` gives `quest3+` (`questpro+` or `quest2+` when it lists an older headset). Values are checked against Meta's documented specifiers (`quest2only`, `questproonly`, `quest3only`, `quest2+`, `questpro+`, `quest3+`, `questpro-`, joined with `|`) and anything else fails prebuild. `false` or `''` removes the entry. The pico, dual, mobile and main manifests never get it, and the quest manifest is never created just for this entry.

### Patch Changes

- 53f12cb: The Eskiu runtime builds with eskiuc 0.14.1, and only with that version. `scripts/install-eskiuc.sh` and `ExpoPicoEskiu.cmake` both read it from `cmake/eskiu-version.txt` in the runtime. The CMake lookup clears any cached compiler, searches the directory of `$ESKIUC` and `~/.local/eskiu-0.14.1/bin` before `PATH`, and checks `eskiuc --version`; a missing compiler or one at another version stops the arm64 configure with an error that names `scripts/install-eskiuc.sh` and `ESKIUC=`. Before this, any `eskiuc` on `PATH` was used, and a stale 0.10.0 built a Quest APK while the repo pinned 0.14.0. `EXPO_PICO_REQUIRE_ESKIU` is gone, since the compiler is now always required. 0.14.1 adds no breaking changes: the runtime uses no packed structs, and the icon tests and the aarch64-linux-android object compile pass on it.
- dbbc8a7: The scene registered with `registerImmersiveScene()` asks for the eye tracking permission when it mounts in the immersive activity: `com.oculus.permission.EYE_TRACKING` on the `quest` flavor and `com.picovr.permission.EYE_TRACKING` on PICO builds. Viro's OpenXR renderer targets with `XR_EXT_eye_gaze_interaction`, and the runtime keeps the gaze pose inactive until the app holds the permission. react-viro's plugin declares it in the manifest but nothing requested it at runtime, so on Meta VR Glasses look-and-pinch never activated and selection fell back to the hand ray. `enterImmersiveScene()` does not ask: Meta's porting guide says a hybrid app must request eye tracking only when the immersive activity launches, and a request from the 2D panel fails the Look and Pinch review. The request happens once per process, only when the manifest declares the permission and it is not yet granted, and never on the `mobile` flavor. The scene renders without waiting for the answer, and a denial is logged. `ensureEyeTrackingPermission(mode)` is exported for apps whose immersive activity mounts a root of their own, such as Viro's `ViroQuestEntryPoint`.
- f3a9511: The eye tracking request no longer closes XR. It went through `PermissionsAndroid`, which starts the grant dialog from the React context's current activity, and while the immersive activity is in front that can still be the 2D panel's MainActivity. The dialog opened in the panel's task, the panel resumed, and react-viro's VRActivity finished itself: on a Quest 3S the first Enter XR after install closed after about 0.4 s. The request now goes through the new `requestImmersivePermission` on `PicoCore`, which asks from the immersive activity instance itself, so the dialog stays in that activity's task. It is also skipped on headsets without eye tracking hardware (`oculus.software.eye_tracking` on Horizon OS, `picovr.software.eye_tracking` on PICO, so Quest 3/3S and PICO 4 Ultra never ask), and on PICO builds whose `eyeTracking` option is off. A denial still leaves XR open with the hand ray, and the request still happens at most once per process.
- f63977a: The phone APK no longer declares `android.hardware.vr.headtracking`. `@reactvision/react-viro` 3.0.2 in QUEST mode writes it into the main manifest with `android:required="true"`, so the mobile flavor inherited a hard requirement that no phone meets, and Play and the package installer refused it. The finalized mod that strips Meta entries now also writes `<uses-feature android:name="android.hardware.vr.headtracking" tools:node="remove"/>` into the mobile flavor manifest. Removal beats `required="false"`: phones have no VR head tracking, and nothing in the mobile build reads the declaration (runtime probes use `PackageManager.hasSystemFeature`). The quest flavor keeps `required="true"` and the pico flavor keeps its own `required="false"`.
- c32621e: Nitrogen output is regenerated with `nitrogen@1.0.0-alpha.nightly.120.g33ef045b96c0`, and the apps that consume it must install `react-native-nitro-modules` and `nitro-core` at that same exact version. The `.120` runtime passes Kotlin callbacks through JNI as `Callback` (margelo/nitro#2009), so the generated Android specs lose their private `*_cxx` listener bridges, and `JNICallback`, `JUInt64` and `JNIArrays` from `.100` are gone. Spec files, the JS API and the public Kotlin signatures that `Hybrid*` classes override are unchanged. Nitro V1 is still alpha-nightly; there is no stable 1.0 release. The `react-native-nitro-modules` and `nitro-core` peer ranges are now `>=1.0.0-alpha.nightly.120.g33ef045b96c0` instead of `*`, so an app on an older Nitro gets a peer warning at install instead of a missing `JCallback.hpp` at C++ compile time.
- b1dcf09: The staged `libopenxr_loader.so` overlay moves from Khronos 1.1.62 to 1.1.65 (`org.khronos.openxr:openxr_loader_for_android`, Maven Central). Every `PT_LOAD` segment is still aligned to `0x4000`, and it exports the same 56 symbols.
- 38f5356: Quest builds without a `picoAppId` now package expo-horizon-core's `quest` variant. The plugin wrote `missingDimensionStrategy "device", "mobile"` into `defaultConfig` for every `buildVariant: 'mobile'` app, and that value overrides the `quest` flavor expo-horizon-core adds in the same `device` dimension. `assembleQuestDebug` then packaged the mobile variant, `ExpoHorizon.isHorizonBuild` read `false`, and a Quest 3S ran the phone layout with no Layout SDK windows. The strategy now applies in `androidComponents.finalizeDsl` only when the app has no `device` dimension of its own, and a prebuild replaces the block older versions wrote.

  The New Architecture flag guard (`skipActivityIdentityAssertionOnHostPause`) is now added to `MainApplication` whenever `@reactvision/react-viro` is a config plugin, not only when `xrMode` is a PICO mode. A quest-only app has react-viro's `VRActivity` too, and without the guard Enter XR on a Quest 3S crashed with `AssertionError: Pausing an activity that is not the current activity`.

- 0cea78f: Quest builds with `viroRendererOverlay` on the `expo-horizon-core` plugin entry now show Meta's own controller models. The staged `libviro_renderer.so` is rebuilt from mikevocalz/virocore `5aac6b51` (PR #103) and loads controller meshes through `XR_FB_render_model`, falling back to the neutral mesh only where the runtime supplies none. While the renderer is staged into `quest`, the quest flavor manifest gets `com.oculus.permission.RENDER_MODEL` and an optional `com.oculus.feature.RENDER_MODEL`; turning the overlay off removes them. The pico, dual, mobile and main manifests never get either entry.
- 6a079be: A `com.oculus.supportedDevices` list with `vrglasses` now derives `storeDeviceTargets` `quest3+`, the same as `quest3` or `quest3s`. Meta's port guide (2026-09-14) and manifest reference list `vrglasses` as a canonical identifier, so the example's quest flavor now declares `quest3|quest3s|vrglasses` on both `expo-horizon-core` and react-viro's `questSupportedDevices`.
- a6423a2: Ship the Viro renderer from virocore f9304078: Meta Touch Plus controller models now render with their KTX2 (Basis Universal) textures.
- 0fad7d5: The staged `libviro_renderer.so` is rebuilt from mikevocalz/virocore `a346988f` (PRs #103 through #109). On Quest, when the runtime has no controller model about 8 seconds after the controller is tracked (for example because `com.oculus.permission.RENDER_MODEL` is missing), the hand now shows the neutral mesh and keeps polling for the runtime model instead of staying empty.
- eae9f76: Make installed PICO packages self-contained for normal Android builds: release
  the compiled Eskiu runtime, declare config-plugin runtime dependencies, align
  sibling Core peer ranges with the shipped version, and resolve the doctor's
  Expo configuration loader through the consuming app.

  Preserve starter app commands and development dependencies in release branches.
  Start the renderer-free template as a native panel, with an explicit immersive
  configuration recipe and registered PICO app identity. Verify packed packages
  in fresh npm and isolated pnpm projects, including repeated clean prebuilds and
  a native PICO APK build without a custom compiler or local AAR provisioning.

  Check installed Viro native archives before Gradle starts, including hash
  verification when the renderer release supplies a paired-artifact manifest.
  Report unimplemented XR methods accurately instead of asking for SDK archives
  that cannot enable them.

- a12c25c: `viroRendererOverlay` now stages `libviro_renderer.so` and `controller_neutral.glb` into the `quest` flavor as well as `pico` / `dual`. Since 1.0.0 the overlay only reached the PICO flavors, so Quest builds fell back to the stock ViroReact 3.0.2 renderer: the floor sat at eye level and controller models were missing. The OpenXR loader overlay stays in `pico` / `dual`; stock Viro 3.0.2 already ships a 16KB-aligned loader that the overlay renderer links against. `main` and `mobile` get neither, and turning the option off removes the quest copies.

## 1.0.0

### Major Changes

- f410e49: Migrates the whole family to Nitro Modules, and adds PICO Swan OS native
  runtime support plus a stack of platform hardening.

  All packages in the `expo-pico-*` family bump to 1.0.0 together — they are configured as `linked` in `.changeset/config.json`. The major bump reflects two realities:
  1. Strict peer-semver: siblings declare `peerDependencies: { "@expo-pico/core": ">=0.1.0" }`, and changesets cascades every peer-dep version change as a major bump on the consumer. Going from 0.1.x → 0.2.0 on core forces siblings to 1.0.0 regardless of declared range width.
  2. Install-visible manifest changes: the launcher contract (`pvr.app.type`, `IMMERSIVE_HMD`, queries) and the `<uses-native-library>` + ABI filter change what APKs look like on disk. Consumers reviewing merged manifests on upgrade will see real diffs.

  The plugin option API itself is strictly additive — every new option defaults off (or tracks an existing option like `xrMode`), so config written for 0.1.x keeps working unchanged.

  ## `expo-pico-core` (minor)

  **Platform mode (Swan)**
  - New `xrMode` plugin option (`'mobile' | 'pico-os5' | 'pico-swan'`). Drives MainApplication injection of `PicoCorePackage(PicoXRPlatform.<MODE>)` and the `PICO_XR_MODE` BuildConfig field.
  - Opt-in `settings.gradle` Swan subproject inclusion via `picoSwan.swanRuntimeProject`; opt-in Swan Maven dep via `picoSwan.swanSdkArtifact`.
  - Native seams `PicoSwanRuntime` and `PicoOs5Runtime` for per-platform runtime init.
  - Runtime API: `getXrMode()`, `isSwanRuntime()`.

  **Launcher contract**
  - New `appType` option (`'vr' | 'mr' | '2d'`) emits `pvr.app.type` meta-data, OpenXR `IMMERSIVE_HMD` + `com.pico.intent.category.VR` + legacy `com.picovr.intent.category.VR` on `.MainActivity`, and `<queries>` for `com.pico.os.systemui` + `com.pico.platform`.
  - Runtime API: `getAppType()`.

  **Platform SDK identity**
  - New `platformService` option: `picoAppId`, `picoAppKey`, `picoMerchantId`, `picoPayKey`, optional `foreign` region pair, `declareActivities`.
  - Emits `pico_app_id` / `_foreign` / `_key` string resources, IAP resources, and the `com.pico.loginpaysdk.UnityAuthInterface` + `PicoSDKBrowser` activities.
  - BuildConfig fields: `PICO_APP_KEY`, `PICO_HAS_PLATFORM_IDENTITY`, `PICO_HAS_IAP_IDENTITY`.
  - Runtime API: `hasPlatformIdentity()`, `hasIapIdentity()`.

  **Hardware capabilities**
  - New capability options: `eyeTracking`, `faceTracking`, `bodyTracking`, `spatialAudio`, `foveatedRendering`, `highSamplingRateSensors`, `refreshRates: number[]`, `boundary`, `sceneMesh`. Each emits `uses-feature` (`android:required="false"`), `uses-permission`, and/or meta-data entries.
  - `PicoSpatialMode` gains `volume` (PICO OS 6 3D Volume container).

  **Platform hardening**
  - New `ndkAbiFilters` option (default true under PICO xrModes): restricts `pico`/`dual` flavors to `arm64-v8a`. The `mobile` flavor is never filtered.
  - New `openXrLoaderDeclaration` option (default true under PICO xrModes): emits `<uses-native-library android:name="libopenxr_loader.so" android:required="false"/>`. Required for `targetSdkVersion >= 31`. Renderer-agnostic — works with `@reactvision/react-viro` (example app), Unity-as-a-Library, and any Android renderer using the system OpenXR loader.
  - New prebuild diagnostics (`withPicoDiagnostics`) emits `WarningAggregator` warnings for seven misconfig patterns (immersive-without-identity, 2d-with-pico-xrMode, mobile-with-immersive-appType, capability-toggles-under-mobile, Swan-subproject-without-Swan, refreshRates-under-mobile, partial IAP identity).

  **Runtime diagnostics**
  - New diagnostics API: `getPicoDiagnostics()`, `buildDiagnosticsReport()`, `readBuildTimeFacts()`, `readRuntimeFacts()`, `formatDiagnostics()`.
  - Native module gains three async functions (`hasSystemFeature`, `getDeclaredFeatures`, `getDeclaredPermissions`) wrapping `PackageManager`.
  - Seven finding classes: `identity.missing`, `feature.missing:*`, `build-device-mismatch`, `mobile-on-pico-device`, `feature.optional-missing:*`, `swan/os6.uninitialized`, `permission.ungranted:*`.

  ## Sibling packages (linked, minor)

  All sibling packages (`expo-pico-spatial`, `expo-pico-account`, `expo-pico-iap`, `expo-pico-notifications`, `expo-pico-rtc`, `expo-pico-rooms`, `expo-pico-subscription`, `expo-pico-storage`, `expo-pico-social`, `expo-pico-achievements`, `expo-pico-leaderboards`) bump in lockstep per the `linked` policy.
  - Package metadata hardening: `repository` URL now points to `github.com/mikevocalz/expo-pico`, `files` array restricted to the published surface (`build`, `android`, `plugin/build`, `app.plugin.js`, `expo-module.config.json`), `homepage` and `bugs` populated.
  - No code changes.

  ## Nitro Modules migration (breaking)

  The native surface moves off `expo-modules-core`'s module bridge onto
  [Nitro Modules](https://nitro.margelo.com). Every package now ships a
  `nitro.json`, a `*.nitro.ts` spec, a Kotlin `Hybrid*` implementation, a C++
  registration TU, and a `CMakeLists.txt`; `nitrogen/generated` is part of the
  published `files` because `android/build.gradle` and `android/CMakeLists.txt`
  both `apply from:` / `include()` it.

  **Consumers must install `react-native-nitro-modules` (>= 0.37.0)** — it is a
  declared peer dependency, not a transitive one.

  Build scripts change from `expo-module build` to `nitrogen && tsc`.
  `expo-module-scripts` is gone entirely; per-package `.eslintrc.js` and the
  plugin `tsconfig.json` files that extended it now inherit from the repo root
  `.eslintrc.js` and `tsconfig.base.json`.

  ### API breaks beyond the native swap
  - **`@expo-pico/platform-service-common`** drops `createNativeEventEmitter`,
    `safeAddListener`, `resolveNativeModule`, `PicoPage` and `DEFAULT_PAGE_SIZE`.
    Nitro listeners are id-based, so listener registration returns a numeric id
    wrapped in a `Subscription`; use `resolveHybridObject` in place of
    `resolveNativeModule`.
  - **`@expo-pico/storage`** — `saveEntry(key, value, type, options?)` takes a
    required `StorageEntryType` as its third argument. Previously
    `saveEntry(key, value, options?)`.
  - **`@expo-pico/rooms`** — `RoomSessionState.roomId` and `.role` are now
    optional (`undefined` when absent) rather than `null`. Nitro specs have no
    null, so the absent case crosses the bridge as `undefined`. Check with
    `== null` or `?.` if you need to accept both.
  - **`@expo-pico/core`** — `capabilities.hand.triggerHaptic()` renames its first
    parameter `hand` to `side`. Positional, so callers are unaffected; named-
    argument or `.length`-style reflection is not.

  ### New PPS-backed exports

  Verified against `javap` on the published AARs, not inferred.
  - **`@expo-pico/account`** — `getAdultStatus()`, `getAuthorizedScopes()`,
    `requestAuthScopes(scopes)`, `cancelAuthorization()`. `getAdultStatus()`
    returns `'unknown' | 'minor' | 'adult'` rather than a boolean, because PPS
    distinguishes an unverified account from a confirmed minor and an age gate
    needs that distinction.
  - **`@expo-pico/iap`** — `isProductPurchased(sku)`, a per-SKU ownership check
    that avoids pulling the whole purchase list.

  ### PPS surface is now complete

  Every call in the per-service tables of `docs/PPS-API-SURFACE.md` has a
  TypeScript surface. Additions beyond those listed below: `getInvitableUsers()`,
  `getSentInvites()`, paginated `getDestinations()`, `launchApp()` and
  `addLaunchDetailsListener()` on social, and `sendAuthScopesRequest()` on
  account.

  Pagination uses the opaque `nextPageToken` that `getFriendList` already
  round-tripped `NextInfo` through — a token appears only when `hasNext` is true,
  so callers never read `hasNext`. `getDestinations()` changes from
  `Promise<PicoDestination[]>` to `Promise<DestinationListResult>` to carry it.

  `sendAuthScopesRequest()` returns `refreshToken` among other credentials.
  Prefer exchanging the returned `authCode` server-side over holding a long-lived
  token in the JS bundle.

  ### `@expo-pico/social` — launch intent, destinations, share, invite flows

  Verified against `javap` on `platform-service-social`.
  - `getLaunchDetails()` — **synchronous**, because PPS returns it from a getter
    rather than a `Task`: the launch intent is resolved before the app runs. It
    is how an app learns it was opened from an invite or deep link rather than
    normally. Never throws; reports a normal launch when PPS is absent, so
    startup code can read it without guarding.
  - `getDestinations()`, `launchPresenceInvitePanel()`,
    `launchInviteUserJoinRoomFlow(roomId)`, `launchStore()`, `shareVideo()`,
    `shareImages()`.

  `getDestinations()` returns the first page only. `DestinationsListResult` also
  carries a `NextInfo` cursor, but how `NextInfo(hasNext, nextId, bodyParams)`
  encodes into the family's opaque `nextPageToken` is still undecided — see
  PPS-WIRING-GAPS.md. Inventing a token format now would be an API break to undo.

  ### Removed `expo-module.config.json`

  All twelve were `{"platforms":[]}` — no module to autolink, and not listed in
  any package's `files`, so they were never published. `withPicoNitroModules`
  already documented the Nitro migration as having removed them; the files had
  been emptied rather than deleted. Config plugins are unaffected: they resolve
  through `app.plugin.js`, which every plugin-bearing package does ship.

  ### `@expo-pico/notifications` — push can now actually be received

  `register()` only ever yielded a token, so an app could be addressed but never
  hear anything. Wired the rest of `IPPSPushClient`:
  - `addPushMessageListener()` / `addPushRevocationListener()` — PPS accepts one
    receiver per client, so the first listener installs it and the last one
    removed uninstalls it; listeners are multiplexed in Kotlin.
  - `unregisterForPushNotifications()` — releases the token.

  ### OpenXR loader 1.1.49 -> 1.1.62

  `expo-pico-core` overlays a 16KB-page-aligned Khronos `libopenxr_loader.so`
  over the 4KB-aligned copy renderers bundle, because PICO OS 6 / Android 14+
  silently refuse to load the latter. Bumped to Khronos 1.1.62 and confirmed
  every PT_LOAD segment is still `0x4000`-aligned — the property the overlay
  exists for. `scripts/verify-16kb-alignment.py` now exists and checks it (the
  plugin had referenced that script since it was written; it had never been
  added).

  ### `@expo-pico/rooms` — new export

  `getFriendsAndRooms()` surfaces the read-only friends-and-rooms discovery feed
  that previously existed only inside `getRoomInfo()`. Returns one `RoomInfo` per
  distinct room, `[]` when no friend is in one. `memberCount` counts the friends
  visible in that room, not the room's true occupancy, which PPS does not report.
  PPS marks the underlying call `@Deprecated("Legacy")` with no replacement.

  ### Docs

  `orientation` in the QUICKSTART, migration guide and `@expo-pico/core` README
  examples was `'landscape'`, which contradicts `expo-pico-doctor` — a locked
  orientation writes `android:screenOrientation` onto MainActivity and overrides
  the `defaultWidth`/`defaultHeight` the plugin writes. All three now show
  `orientation: 'default'` with the rationale inline.
