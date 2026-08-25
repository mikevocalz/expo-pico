# @expo-pico/platform-service-common

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
