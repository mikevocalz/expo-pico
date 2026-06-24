# expo-pico Architecture Document

Complete design specification for the `expo-pico` package family — Expo-native PICO OS 6 support via config plugins and Expo Modules.

---

## 1. Architecture Summary

### Why a package family?

PICO OS 6 platform integration spans multiple concerns: build configuration, runtime device detection, account services, in-app purchases, push notifications, and spatial/XR runtime helpers. Bundling all of these into a single monolithic package would:

- Force every consumer to pull in all PICO SDK dependencies regardless of need
- Create a single package with too many owners and too many reasons to change
- Make semver meaningless — a breaking change in IAP would force a major bump for everyone

Following the `expo-horizon` pattern (core + location + notifications), we split into focused packages with clear ownership boundaries. Each sibling package depends on `expo-pico-core` as a peer, inheriting the base build infrastructure without duplicating it.

### Why `expo-pico-core` comes first

Every sibling package needs:

- Product flavors already injected in `app/build.gradle`
- PICO Maven repository available in the project
- `picoAppId` accessible via `gradle.properties` and `BuildConfig`
- A way to detect at runtime whether the build is PICO-targeted

`expo-pico-core` owns all of this. Without it, sibling packages would each need to independently inject flavors and repos — creating conflicts and duplication. Core ships first; siblings ship when their native SDK surface is ready.

### Why config plugins + Expo Modules are the correct v1 choice

- **Config plugins** handle all Android project mutation during `npx expo prebuild`. This is the Expo-native way to modify `AndroidManifest.xml`, `build.gradle`, `gradle.properties`, and `strings.xml` without ejecting or maintaining a bare workflow.
- **Expo Modules API** (`expo-modules-core`) provides a stable, maintained bridge for exposing native constants and functions to JS. It handles module registration, lifecycle, and type bridging across New Architecture.
- Together, they cover v1's full scope: project configuration + runtime detection.

### Why Nitro Modules are intentionally excluded from v1

Nitro Modules are designed for high-performance native interop scenarios (e.g., camera pipelines, audio processing, real-time sensor data). The v1 surface of `expo-pico-core` exposes only synchronous constants and simple async queries — well within Expo Modules' capabilities. Introducing Nitro would:

- Add a build-time dependency on `react-native-nitro-modules`
- Require consumers to configure Nitro's codegen pipeline
- Add complexity without measurable benefit for the current API surface

If a future sibling package (e.g., `expo-pico-spatial`) needs low-latency frame-synchronized data from PICO's spatial SDK, Nitro can be evaluated at that point — scoped to that package, not forced onto core.

### How the design supports SDK 55 + RN 0.84.1 today and SDK 56+ later

- **No private RN internals**: All native code uses public Android APIs (`Build.MANUFACTURER`, `Build.MODEL`, system properties) and the stable Expo Modules Kotlin DSL.
- **No version-specific hacks**: Gradle injection uses string insertion with idempotency markers — no regex replacements that assume specific Gradle file shapes.
- **Config plugin mods are stable**: `withAppBuildGradle`, `withProjectBuildGradle`, `withStringsXml`, `withGradleProperties`, `withDangerousMod` have been stable since Expo SDK 47+.
- **peerDependencies are intentionally wide**: `"expo": ">=55.0.0"` allows SDK 56+ to work without a core version bump, as long as the config plugin API surface hasn't broken.
- **Forward migration path**: When SDK 56 ships, the only expected changes are `devDependencies` version bumps and validation. No architectural changes are anticipated.

---

## 2. Proposed Monorepo Tree

```
expo-pico/
├── package.json                          # Workspace root
├── tsconfig.base.json                    # Shared TS config
├── .gitignore
├── .nvmrc
├── .prettierrc
├── ARCHITECTURE.md                       # This document
├── README.md                             # Repo-level README
│
├── packages/
│   ├── expo-pico-core/                   # Core package — ships first
│   │   ├── package.json
│   │   ├── app.plugin.js                 # Plugin entrypoint (points to compiled plugin)
│   │   ├── expo-module.config.json       # Expo Module registration
│   │   ├── tsconfig.json                 # Module TS config
│   │   ├── jest.config.js
│   │   ├── README.md
│   │   │
│   │   ├── plugin/                       # Config plugin source
│   │   │   ├── tsconfig.json
│   │   │   └── src/
│   │   │       ├── withPico.ts           # Main plugin orchestrator
│   │   │       ├── types.ts              # Plugin option types + resolver
│   │   │       ├── constants.ts          # PICO platform constants
│   │   │       ├── utils.ts              # Shared plugin utilities
│   │   │       ├── withPicoAndroidManifest.ts
│   │   │       ├── withPicoGradle.ts
│   │   │       ├── withPicoGradleProperties.ts
│   │   │       └── withPicoStrings.ts
│   │   │
│   │   ├── src/                          # JS module source
│   │   │   ├── index.ts                  # Public API
│   │   │   ├── types.ts                  # Runtime types
│   │   │   └── ExpoPicoModule.ts         # Native module binding
│   │   │
│   │   ├── android/                      # Native Android code
│   │   │   ├── build.gradle
│   │   │   └── src/
│   │   │       ├── main/
│   │   │       │   ├── AndroidManifest.xml
│   │   │       │   └── java/expo/modules/pico/
│   │   │       │       ├── ExpoPicoModule.kt
│   │   │       │       └── PicoDeviceUtils.kt
│   │   │       ├── pico/                 # Pico flavor source set
│   │   │       │   └── java/expo/modules/pico/
│   │   │       │       └── Config.kt    # isPicoBuild = true
│   │   │       └── mobile/              # Mobile flavor source set
│   │   │           └── java/expo/modules/pico/
│   │   │               └── Config.kt    # isPicoBuild = false
│   │   │
│   │   └── __tests__/
│   │       ├── resolveOptions.test.ts
│   │       └── withPicoGradle.test.ts
│   │
│   ├── expo-pico-spatial/                # Placeholder — spatial helpers
│   │   ├── package.json
│   │   └── src/index.ts
│   │
│   ├── expo-pico-account/                # Placeholder — account/identity
│   │   ├── package.json
│   │   └── src/index.ts
│   │
│   ├── expo-pico-iap/                    # Placeholder — in-app purchases
│   │   ├── package.json
│   │   └── src/index.ts
│   │
│   └── expo-pico-notifications/          # Placeholder — push notifications
│       ├── package.json
│       └── src/index.ts
│
└── example/                              # Example Expo app
    ├── package.json
    ├── app.config.ts
    └── App.tsx
```

---

## 3. `expo-pico-core` v1 Specification

### Exact responsibilities

1. **Android project mutation** via config plugins:
   - Product flavor injection (`mobile` / `pico`)
   - PICO Maven repository injection
   - Gradle properties for `picoAppId`, `picoSpatialMode`, `picoBuildEnabled`
   - BuildConfig fields (`PICO_APP_ID`, `PICO_SPATIAL_MODE`)
   - String resources (`pico_app_id`, `pico_spatial_mode`)
   - PICO-flavor `AndroidManifest.xml` with features, metadata, permission removals

2. **Runtime JS module** via Expo Modules:
   - `isPicoBuild()` — synchronous, from flavor-specific `Config.kt`
   - `isPicoDevice()` — synchronous, from `Build.MANUFACTURER` / `Build.BRAND`
   - `getSpatialMode()` — synchronous, from `BuildConfig.PICO_SPATIAL_MODE`
   - `getPicoRuntimeInfo()` — synchronous aggregate

3. **Sibling package infrastructure**:
   - `picoAppId` in `gradle.properties` for sibling native modules
   - `picoBuildEnabled` flag for sibling config plugins to guard their mutations
   - PICO Maven repo available project-wide

### Non-responsibilities (what stays out of v1)

- **PICO Platform SDK runtime calls** (login, IAP, notifications) → sibling packages
- **Spatial anchoring, scene mesh, passthrough rendering** → `expo-pico-spatial`
- **OpenXR or PICO Unity SDK integration** → out of scope entirely
- **iOS support** → PICO is Android-only
- **Legacy Architecture support** → New Architecture only
- **EAS Build custom workflows** → documentation only, no code in core
- **Controller input handling** → future sibling or community package

### Ownership boundaries

- `expo-pico-core` owns everything under `packages/expo-pico-core/`
- Sibling packages must not modify files that core owns (flavors, base manifest)
- Sibling packages may add their own flavor-specific source sets (e.g., `app/src/pico/` subdirectories) but must not overwrite core's manifest
- Sibling packages read `picoAppId` from `gradle.properties` — they do not inject it themselves

---

## 4. Public API Types

### Plugin Options (config-time)

```typescript
interface PicoPluginOptions {
  enabled?: boolean; // Master toggle — all mutations
  picoAppId?: string; // PICO platform app ID
  buildVariant?: 'mobile' | 'pico'; // Flavor strategy
  targetDevices?: PicoDeviceTarget[]; // Supported hardware
  spatialMode?: PicoSpatialMode; // Rendering mode
  handTracking?: boolean; // uses-feature declaration
  passthrough?: boolean; // uses-feature declaration
  sceneUnderstanding?: boolean; // uses-feature declaration
  entitlementCheck?: boolean; // DRM metadata
  minSdkVersion?: number; // Pico flavor minSdk
  targetSdkVersion?: number; // Pico flavor targetSdk
}

type PicoDeviceTarget = 'pico-4' | 'pico-4-ultra' | 'neo3' | 'swan';
type PicoSpatialMode = '2d' | 'windowed' | 'immersive';
```

### Runtime Types (JS)

```typescript
interface PicoRuntimeInfo {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: PicoSpatialMode;
  picoAppId: string | null;
  picoOsVersion: string | null;
  deviceModel: string | null;
}
```

### Option stability analysis

| Option               | Mutates                                  | Stability |
| -------------------- | ---------------------------------------- | --------- |
| `enabled`            | All (guard)                              | Permanent |
| `picoAppId`          | gradle.properties, BuildConfig, manifest | Stable    |
| `buildVariant`       | app/build.gradle, source sets            | Stable    |
| `targetDevices`      | Manifest meta-data                       | May grow  |
| `spatialMode`        | Manifest meta-data, BuildConfig, JS      | Stable    |
| `handTracking`       | Manifest uses-feature                    | Stable    |
| `passthrough`        | Manifest uses-feature                    | Stable    |
| `sceneUnderstanding` | Manifest uses-feature                    | Stable    |
| `entitlementCheck`   | Manifest meta-data                       | Stable    |
| `minSdkVersion`      | app/build.gradle pico flavor             | Stable    |
| `targetSdkVersion`   | app/build.gradle pico flavor             | Stable    |

To keep the surface stable: new options should be additive with sensible defaults. Breaking changes (renaming, removing, or changing the semantics of existing options) require a semver major bump.

---

## 5. Native Mutation Plan

### `withGradleProperties` — gradle.properties

**Mod type**: Safe, structured (array-based)

Injects:

- `picoAppId=<value>` — consumed by library and sibling `build.gradle` files
- `picoSpatialMode=<value>` — consumed by BuildConfig injection
- `picoBuildEnabled=true` — signal to sibling plugins

**Idempotency**: Upsert by key — existing entries updated, new entries appended.

### `withProjectBuildGradle` — project-level build.gradle

**Mod type**: Safe, string-based

Injects the PICO Maven repository into `allprojects.repositories`:

```groovy
maven { url "https://developer.pico-interactive.com/maven" }
```

**Idempotency**: Guarded by marker comment `// expo-pico-core: pico maven repo`.

**Fragility note**: SDK 55 still generates `allprojects` in `build.gradle`. If future Expo versions move this to `settings.gradle`, the fallback path handles it with a warning. This is the most likely migration point for SDK 56+.

### `withAppBuildGradle` — app/build.gradle

**Mod type**: Safe, string-based

Injects (always):

- `buildConfigField` entries for `PICO_APP_ID` and `PICO_SPATIAL_MODE`

Injects (when `buildVariant: 'pico'`):

- `flavorDimensions` and `productFlavors` block (mobile + pico)

Injects (when `buildVariant: 'mobile'`):

- `missingDimensionStrategy "device", "mobile"` in `defaultConfig`

**Why `missingDimensionStrategy`**: The `expo-pico-core` library module declares a `"device"` flavor dimension (for the `Config.kt` flavor source sets). When the app does _not_ inject matching flavors (`buildVariant: 'mobile'`), Gradle would fail with a dimension mismatch. The `missingDimensionStrategy` tells Gradle to resolve the library's `"device"` dimension to `"mobile"`, which maps to `Config.isPicoBuild = false`. This is correct for a non-PICO build.

**Idempotency**: Guarded by marker comments. Regex `android\s*\{` is used only to find the insertion point — the inserted content is static, not derived from regex captures.

**Why not `withDangerousMod`**: `withAppBuildGradle` provides the file contents as a string, which is sufficient for insertion. No file-system access is needed.

### `withStringsXml` — strings.xml

**Mod type**: Safe, structured (XML-parsed)

Injects:

- `pico_app_id` — available to native code via `R.string.pico_app_id`
- `pico_spatial_mode` — available to native code via `R.string.pico_spatial_mode`

Both marked `translatable="false"`.

**Idempotency**: Upsert by `name` attribute.

### `withDangerousMod` — PICO-flavor AndroidManifest.xml

**Mod type**: Dangerous (file-system write)

**Why it's necessary**: Expo config plugins have no mod for writing arbitrary source set files. The PICO flavor needs its own `AndroidManifest.xml` at `app/src/pico/AndroidManifest.xml` which Android's manifest merger combines with the main manifest at build time. There is no safe config-plugin alternative for this.

**What it writes**:

- `uses-feature` elements: VR headtracking, hand tracking, passthrough, scene understanding
- `uses-permission` removals: telephony/SMS permissions via `tools:node="remove"`
- `meta-data` elements: supported devices, spatial mode, app ID, entitlement check
- `android:allowBackup="false"` with `tools:replace`

**Idempotency**: The file is written fresh on each prebuild. Since CNG regenerates the entire `android/` directory on `--clean`, this is safe. The manifest is declarative XML, not an append operation.

### What is NOT mutated

- **`MainApplication.kt`** — not needed; Expo Modules auto-register via `expo-module.config.json`
- **`MainActivity.kt`** — not needed; no activity-level modifications required for v1
- **`settings.gradle`** — not needed for SDK 55; may need attention for SDK 56+ if `allprojects` moves

---

## 6. Build Flavor Strategy

### Recommended model

```
flavorDimensions "device"

productFlavors {
    mobile {
        dimension "device"
    }
    pico {
        dimension "device"
        minSdkVersion 32
        targetSdkVersion 34
    }
}
```

This produces four build variants:

- `mobileDebug` / `mobileRelease` — standard Android phone/tablet
- `picoDebug` / `picoRelease` — PICO XR headset

### Why flavors are useful

1. **Manifest isolation**: PICO-specific manifest entries (VR features, permission removals) only apply to `pico` builds. Mobile builds are unaffected.
2. **Compile-time constants**: The `Config.kt` file differs per flavor (`isPicoBuild = true` vs `false`), giving zero-cost runtime detection.
3. **SDK version control**: PICO OS 6 requires API 32+; mobile builds can target lower APIs if needed.
4. **Store separation**: `picoRelease` APK/AAB goes to PICO Store; `mobileRelease` goes to Google Play.

### Preserving normal Android build behavior

- The `mobile` flavor is effectively a no-op — it adds no modifications to the base Expo-generated project. Running `mobileDebug` produces the same result as a standard Expo Android build.
- `npx expo run:android` without `--variant` will use the default variant. Gradle selects the first flavor alphabetically when no default is set — since `mobile` comes before `pico`, the default behavior is standard Android.

### Expo dev workflow sanity

- `npx expo start` (Metro dev server) is unaffected by flavors — it serves JS regardless of build variant.
- `npx expo run:android --variant picoDebug` connects to Metro normally; the only difference is the native binary has PICO-specific manifest entries and `Config.isPicoBuild = true`.
- `npx expo prebuild --clean` regenerates everything, including flavor directories.

### How sibling plugins attach PICO-only behavior

Sibling packages should:

1. Check `picoBuildEnabled` in `gradle.properties` before injecting their own mutations
2. Add their own source sets under `app/src/pico/` if they need flavor-specific native code
3. Never re-declare `flavorDimensions` or `productFlavors` — core owns this

---

## 7. Runtime Module API

### API surface

| Function               | Return Type       | Sync/Async | Source                               |
| ---------------------- | ----------------- | ---------- | ------------------------------------ |
| `isPicoBuild()`        | `boolean`         | Sync       | `Config.kt` (flavor source set)      |
| `isPicoDevice()`       | `boolean`         | Sync       | `Build.MANUFACTURER` / `Build.BRAND` |
| `getSpatialMode()`     | `PicoSpatialMode` | Sync       | `BuildConfig.PICO_SPATIAL_MODE`      |
| `getPicoRuntimeInfo()` | `PicoRuntimeInfo` | Sync       | Aggregate of above + extras          |

### Why everything is synchronous

All values are known at module initialization time:

- **`isPicoBuild`**: Compile-time constant from `Config.kt`
- **`isPicoDevice`**: `Build.MANUFACTURER` is available immediately
- **`spatialMode`**: `BuildConfig` field, resolved at compile time
- **`picoAppId`**: `BuildConfig` field
- **`picoOsVersion`**: System property read (fast, no I/O)
- **`deviceModel`**: `Build.MODEL`

These are exposed as Expo Module **Constants**, which are resolved once at module init and cached. No async bridge calls needed.

### Why not async?

Making `isPicoDevice()` async (as suggested in the requirements as `Promise<boolean>`) would be appropriate if device detection required I/O (e.g., querying a system service). Since we only read `Build.MANUFACTURER`, sync is correct and avoids unnecessary Suspense/loading states in UI code.

The function is exported as `isPicoDevice(): boolean` (sync) rather than `Promise<boolean>` because the underlying check is a string comparison on a static system property. If future PICO SDK versions require async verification (e.g., a service binding), we can add `isPicoDeviceAsync()` without breaking the sync API.

### Extensibility

New constants can be added to `ExpoPicoModule.kt`'s `Constants` block without breaking existing consumers. New async methods can be added via `AsyncFunction` in the module definition. The JS wrapper in `src/index.ts` re-exports individual functions rather than the raw module, allowing us to add validation, type narrowing, and default handling without changing the native interface.

---

## 8. Full Code Scaffolding

All code files have been generated in the repository. See the monorepo tree in Section 2 for the complete file listing.

### Key files summary

**Plugin orchestrator**: `packages/expo-pico-core/plugin/src/withPico.ts`

- Resolves options with defaults
- Chains sub-plugins in dependency order
- Skips flavor-specific mutations when `buildVariant === 'mobile'`

**Native module**: `packages/expo-pico-core/android/src/main/java/expo/modules/pico/ExpoPicoModule.kt`

- Exposes constants via Expo Modules `ModuleDefinition` DSL
- Reads from `Config.kt` (flavor-specific), `BuildConfig`, and `PicoDeviceUtils`

**Flavor configs**:

- `android/src/pico/java/expo/modules/pico/Config.kt` → `isPicoBuild = true`
- `android/src/mobile/java/expo/modules/pico/Config.kt` → `isPicoBuild = false`

**JS API**: `packages/expo-pico-core/src/index.ts`

- Typed wrapper functions over raw native module constants
- Defensive null coalescing for safety

---

## 9. Example App Config

See `example/app.config.ts` for a complete working configuration.

Key points:

- `newArchEnabled: true` is set explicitly
- `orientation: 'landscape'` matches typical XR panel layout
- Plugin options demonstrate all major features
- Sibling plugin placeholder is commented out, ready for activation

---

## 10. Sibling Package Boundaries

### `expo-pico-spatial`

- **Type**: Config plugin + Expo Module
- **Config plugin owns**: Additional manifest metadata for spatial features (anchor persistence, scene mesh capabilities)
- **Expo Module owns**: Runtime APIs for spatial anchoring, scene mesh queries, passthrough control
- **What stays out of core**: All spatial runtime logic, OpenXR integration helpers, scene understanding data types
- **Likely JS API shape**:
  ```typescript
  requestSceneCapture(): Promise<SceneCaptureResult>
  createSpatialAnchor(pose: Pose3D): Promise<AnchorHandle>
  getSpatialBounds(): Promise<SpatialBounds>
  setPassthroughEnabled(enabled: boolean): Promise<void>
  ```

### `expo-pico-account`

- **Type**: Expo Module only (no config plugin needed — picoAppId comes from core)
- **Expo Module owns**: PICO account login flow, identity token retrieval, user profile queries
- **What stays out of core**: All authentication state, token management, user data
- **Likely JS API shape**:
  ```typescript
  login(): Promise<PicoLoginResult>
  getAccessToken(): Promise<string | null>
  getUserProfile(): Promise<PicoUserProfile>
  logout(): Promise<void>
  ```

### `expo-pico-iap`

- **Type**: Config plugin (for PICO billing permission) + Expo Module
- **Config plugin owns**: PICO billing permission declaration, billing service intent filter
- **Expo Module owns**: Product queries, purchase flow, purchase verification, consumption
- **What stays out of core**: All payment state, receipt validation, product catalog management
- **Likely JS API shape**:
  ```typescript
  getProducts(skus: string[]): Promise<PicoProduct[]>
  purchase(sku: string): Promise<PicoPurchaseResult>
  consumePurchase(purchaseToken: string): Promise<void>
  getPurchaseHistory(): Promise<PicoPurchase[]>
  ```

### `expo-pico-notifications`

- **Type**: Config plugin (for notification permissions/services) + Expo Module
- **Config plugin owns**: PICO notification service declarations in manifest, push channel configuration
- **Expo Module owns**: Push token registration, notification listeners, notification display
- **What stays out of core**: All notification state, channel management, payload handling
- **Likely JS API shape**:
  ```typescript
  registerForPushNotifications(): Promise<string> // returns push token
  addNotificationListener(callback: (notification: PicoNotification) => void): Subscription
  setBadgeCount(count: number): Promise<void>
  ```

---

## 11. Versioning and Compatibility Strategy

### peerDependencies

```json
{
  "expo": ">=55.0.0",
  "react": "*",
  "react-native": "*"
}
```

- `expo` is pinned to `>=55.0.0` because the config plugin API and Expo Modules API we use are stable from SDK 55 onward.
- `react` and `react-native` are not pinned because we don't use RN internals. The correct RN version is determined by the Expo SDK version.
- Sibling packages additionally peer-depend on `expo-pico-core: ">=0.1.0"`.

### Supported Expo versions

| expo-pico-core | Expo SDK | Status                |
| -------------- | -------- | --------------------- |
| 0.1.x          | 55       | Stable baseline       |
| 0.2.x (future) | 56       | Forward-compat target |

### Semver expectations

- **Patch (0.1.x)**: Bug fixes, new device targets in `PicoDeviceTarget`, documentation
- **Minor (0.x.0)**: New plugin options (with defaults), new runtime APIs, new sibling packages
- **Major (x.0.0)**: Breaking changes to plugin option semantics, removal of options, Expo SDK minimum bump

### Testing strategy across SDK versions

1. **SDK 55**: Primary CI target. All tests run against SDK 55's `@expo/config-plugins` and `expo-modules-core`.
2. **SDK 56+**: Secondary CI target added when SDK 56 is released. Expected to require only `devDependencies` bumps.
3. **Cross-version matrix**: CI should test `expo-pico-core` against both SDK 55 and SDK 56 simultaneously to catch regressions.

### Explicit version honesty

- SDK 55 is the **stable implementation baseline**. All code is tested and validated against it.
- RN 0.84.1 is the current pin under SDK 55. Future RN versions ride in through Expo SDK 56+ per Expo's published support matrix; we do not claim arbitrary RN versions on an older SDK — that would be a false version pairing.
- If Expo SDK 56 introduces breaking changes to config plugin APIs, a new major version of `expo-pico-core` will be required.

---

## 12. Testing Strategy

### Config transform unit tests

**Location**: `packages/expo-pico-core/__tests__/`

**What they test**:

- `resolveOptions()` correctly merges user options with defaults
- Gradle utility functions (`gradleContains`, `insertAfterPattern`) behave correctly
- Idempotency markers prevent duplicate injection

**How to run**: `yarn test` in `packages/expo-pico-core/`

### Snapshot tests for manifest/Gradle mutations

**Approach**: Create test fixtures with known input Gradle/manifest content, run the plugin transform functions, and snapshot the output.

```typescript
// Example: snapshot test for flavor injection
it('injects flavors into a clean build.gradle', () => {
  const input = fs.readFileSync('fixtures/clean-build.gradle', 'utf8');
  const output = applyFlavorInjection(input, resolvedOptions);
  expect(output).toMatchSnapshot();
});
```

**Fixture files**: `__tests__/fixtures/` containing representative `build.gradle` and `AndroidManifest.xml` files from `npx expo prebuild`.

### Example app smoke tests

1. `cd example && npx expo prebuild --clean` — must succeed without errors
2. Verify `android/app/build.gradle` contains `flavorDimensions` and `productFlavors`
3. Verify `android/app/src/pico/AndroidManifest.xml` exists and contains expected elements
4. Verify `android/gradle.properties` contains `picoAppId` and `picoBuildEnabled`

### Android build validation

- `cd example/android && ./gradlew assembleMobileDebug` — must succeed
- `cd example/android && ./gradlew assemblePicoDebug` — must succeed
- Both APKs should be installable on their target platforms

### Regression protection for plugin chaining

Test that `expo-pico-core` plays nicely with other common plugins:

- `expo-camera`
- `expo-notifications`
- `expo-location`

Verify that running prebuild with multiple plugins does not produce:

- Duplicate `flavorDimensions` declarations
- Conflicting manifest entries
- Gradle syntax errors

### PICO-targeted build validation

- Install `picoDebug` APK on a PICO 4 device
- Verify `isPicoDevice()` returns `true`
- Verify `isPicoBuild()` returns `true`
- Verify `getSpatialMode()` returns the configured value
- Verify the manifest metadata is correct via `aapt dump badging`

---

## 13. Failure Modes and Guardrails

### Duplicate manifest entries

**Cause**: Running prebuild multiple times without `--clean`, or another plugin adding the same metadata.
**Prevention**: The PICO-flavor manifest is written fresh each prebuild (not appended). `--clean` is recommended.
**Mitigation**: The manifest merger will warn on duplicates but not fail. Core's manifest uses specific `android:name` keys that are unlikely to collide.

### Gradle injection corruption

**Cause**: The `android {}` block is not found in `build.gradle`, or the file has unexpected formatting.
**Prevention**: Marker-based idempotency checks. If the marker exists, injection is skipped entirely.
**Mitigation**: `console.warn` messages when insertion patterns are not found. The build will still succeed without PICO flavors — just without the PICO-specific variant.

### Plugin ordering conflicts

**Cause**: Another plugin injects `flavorDimensions` before `expo-pico-core`, or uses the same dimension name `"device"`.
**Prevention**: Idempotency check — if `flavorDimensions` already exists, core logs a warning and skips.
**Mitigation**: Document that `expo-pico-core` should be listed before sibling plugins in the `plugins` array. If a third-party plugin conflicts, the user must resolve the dimension conflict manually.

### Missing PICO App ID

**Cause**: User forgets to set `picoAppId` in plugin options.
**Prevention**: `picoAppId` defaults to `''`. The build succeeds but `picoAppId` runtime value is `null`.
**Mitigation**: Sibling packages that require `picoAppId` (e.g., `expo-pico-account`) should throw a clear error at initialization if the ID is empty.

### Sibling/core version mismatch

**Cause**: User installs `expo-pico-iap@0.3.0` with `expo-pico-core@0.1.0` when IAP requires core `>=0.2.0`.
**Prevention**: Sibling packages declare `expo-pico-core` as a peer dependency with a minimum version.
**Mitigation**: npm/yarn will warn about unmet peer dependencies. The sibling package should validate at runtime that core's version is sufficient.

### Unsupported flavor assumptions

**Cause**: A sibling plugin assumes the `pico` flavor exists, but the user set `buildVariant: 'mobile'`.
**Prevention**: Sibling plugins should check `picoBuildEnabled` in `gradle.properties` before adding flavor-specific source sets.
**Mitigation**: If `picoBuildEnabled` is not set, sibling plugins should skip flavor-specific mutations and log a warning.

### `allprojects` block migration (SDK 56+ risk)

**Cause**: Expo SDK 56+ may move `allprojects` from `build.gradle` to `settings.gradle`.
**Prevention**: The PICO Maven repo injection has a fallback path with a warning.
**Mitigation**: When SDK 56 ships, test the repo injection. If the pattern changes, add a `withSettingsGradle` mod path (available since SDK 50).

---

## 14. README Starter

See `packages/expo-pico-core/README.md` for the full README, covering:

- What it is
- Compatibility table (SDK 55, New Architecture only)
- Installation instructions
- Complete plugin options table
- What the plugin configures automatically
- Build variant table with run commands
- Runtime API usage examples
- Limitations
- Roadmap
- License

---

## 15. PICO Swan OS support path (xrMode)

### 15.1 Why a new `xrMode` axis

`buildVariant` (`mobile` | `pico` | `dual`) and `targetProfile`
(`pico4` | `pico4ultra` | `swan` | …) answer different questions:

- `buildVariant` — **which Android artifacts are produced** (flavor source sets
  and manifest merger inputs).
- `targetProfile` — **which hardware family this build is aimed at** (a
  runtime hint, exposed to JS, used for feature gating).

Neither selects **which native XR runtime is registered at app boot**. That
third axis is what a plugin like `@reactvision/react-viro` calls `xRMode`
(`AR` | `GVR` | `OVR_MOBILE`) — it drives `MainApplication` package
registration and the set of native subprojects linked into the APK.

`expo-pico-core` adds this third axis as `xrMode` with three values:

| `xrMode`     | MainApplication registration                        | When to use                                                                 |
| ------------ | --------------------------------------------------- | --------------------------------------------------------------------------- |
| `mobile`     | none (Expo Module auto-registration only)           | Standard Android builds; `buildVariant='mobile'` default                    |
| `pico-os6`   | `PicoCorePackage(PicoXRPlatform.PICO_OS6)`          | PICO 4 / 4 Ultra / Neo3 on PICO OS 6; `buildVariant='pico'` default         |
| `pico-swan`  | `PicoCorePackage(PicoXRPlatform.PICO_SWAN)`         | Project Swan / next-gen spatial target; explicit opt-in                     |

`xrMode` defaults to `pico-os6` when `buildVariant` is `pico` or `dual`, and
to `mobile` when `buildVariant` is `mobile`.

Reusing Meta's `OVR_MOBILE` enum for Swan would be wrong: (a) the name
asserts an Oculus Mobile runtime that PICO Swan does not ship, (b) Quest
VR manifest entries (`com.oculus.intent.category.VR`, `com.oculus.*`
permissions, `oculus.software.*` features) are not valid on PICO OS, and
(c) a single enum value cannot carry Swan-specific manifest meta-data
(`com.pico.swan.spatialContainer`, `com.pico.swan.runtimeVersion`) or
optional Swan Gradle-subproject inclusion.

### 15.2 Plugin API additions

```ts
interface PicoPluginOptions {
  // ... existing fields ...
  xrMode?: 'mobile' | 'pico-os6' | 'pico-swan';
  picoSwan?: PicoSwanPluginOptions;
}

interface PicoSwanPluginOptions {
  swanRuntimeProject?: { name: string; path: string };
  swanSdkArtifact?: string;
  declareSpatialContainerCategory?: boolean; // default true
  swanMinSdkVersion?: number;                 // default 33
  scaffoldSwanSourceSet?: boolean;            // default false
}
```

### 15.3 What each new plugin touches

| File touched                                       | By                           | What is inserted / changed                                                                                      |
| -------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `android/app/src/main/java/.../MainApplication.*` | `withPicoMainApplication`    | Adds `PicoCorePackage(PicoXRPlatform.<MODE>)` + the two imports. Marker-guarded idempotent.                     |
| `android/settings.gradle`                          | `withPicoSettingsGradle`     | Adds `include ':<name>'` + `project(':<name>').projectDir = …` only when `picoSwan.swanRuntimeProject` is set.   |
| `android/app/build.gradle`                         | `withPicoSwan`               | Adds an `implementation project(':…')` and/or `implementation '<artifact>'` dependencies block for Swan.        |
| `android/app/src/picoSwan/java/.../PicoSwanBootstrap.kt` | `withPicoSwan`        | Scaffolds a minimal source-set file when `scaffoldSwanSourceSet: true`. Never overwrites.                        |
| `android/app/src/pico/AndroidManifest.xml`         | `withPicoAndroidManifest`    | Always adds `<meta-data android:name="com.pico.xrMode" android:value="<MODE>"/>`; Swan-only extras when applicable. |
| `android/gradle.properties`                        | `withPicoGradleProperties`   | Writes `picoXrMode=<MODE>` and `picoSwanEnabled=<true|false>`.                                                   |
| `android/app/build.gradle` (BuildConfig)           | `withPicoGradle`             | Adds `buildConfigField "String", "PICO_XR_MODE", "<MODE>"`.                                                     |
| `packages/expo-pico-core/android/build.gradle`     | (direct, not a plugin)       | Adds the same `PICO_XR_MODE` BuildConfig field so the library compiles.                                         |

### 15.4 Native additions (Kotlin)

| Class / file                                                  | Role                                                                          |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `expo.modules.pico.PicoXRPlatform`                            | Enum (`MOBILE`, `PICO_OS6`, `PICO_SWAN`) + `fromValue` / `fromBuildConfig`.   |
| `expo.modules.pico.PicoCorePackage`                           | `ReactPackage` that dispatches to platform-specific runtime init in its ctor. |
| `expo.modules.pico.swan.PicoSwanRuntime`                      | **Extension seam.** Documented no-op until a public Swan SDK ships.           |
| `expo.modules.pico.os6.PicoOs6Runtime`                        | **Extension seam.** Placeholder for boot-time PICO OS 6 service registration. |

### 15.5 What is intentionally NOT copied from Viro Quest support

- **`OVR_MOBILE` enum value.** Replaced with a distinct `PICO_SWAN` value in a
  PICO-owned `PicoXRPlatform` enum.
- **Unconditional `settings.gradle` inclusion.** Viro's helper has no
  idempotency check; re-prebuilds duplicate `include` lines. Our
  `withPicoSettingsGradle` is marker-guarded and opt-in.
- **Oculus-specific manifest categories.** None of
  `com.oculus.intent.category.VR`, `com.oculus.supportedDevices`,
  `com.oculus.permission.USE_ANCHOR_API`, `com.oculus.permission.USE_SCENE`,
  or `oculus.software.handtracking` are valid on PICO OS and none are
  emitted by this plugin. PICO-equivalent entries live under
  `com.pico.*` / `pico.hardware.*` / `pico.software.*` namespaces.
- **Per-mode package accumulation.** Viro registers one `ReactViroPackage`
  per active `xRMode` entry. PICO Swan and PICO OS 6 are mutually exclusive
  at boot; the plugin registers exactly one `PicoCorePackage`.
- **Gradle classpath overrides.** Viro rewrites
  `com.android.tools.build:gradle:4.1.1` in the root build.gradle. The
  Expo SDK 55 toolchain already ships the right AGP; we do not force a
  downgrade.
- **Forced `minSdkVersion` floor across the project.** The Swan floor (33)
  is applied only to the `pico` flavor when `xrMode === 'pico-swan'`.

### 15.6 Extension seams

The following are deliberately left as seams to keep Swan support
extensible without overbuilding today:

1. `PicoSwanRuntime.initialize(context)` — body is a no-op until the
   PICO Spatial / Swan SDK is publicly available. Replace with real
   binding calls then; no plugin changes needed.
2. `picoSwan.swanSdkArtifact` + `picoSwan.swanRuntimeProject` — both are
   null by default. Sibling plugins do not have to react to them.
3. `PicoCorePackage.createViewManagers()` — currently empty. When a
   Swan-native view (e.g., `<PicoSpatialContainer>`) arrives, it is added
   here for `PICO_SWAN` only, not for `PICO_OS6`.
4. `expo.modules.pico.swan` / `expo.modules.pico.os6` subpackages — keep
   platform-specific Kotlin in its own package so deletion or branching
   later is purely additive.
5. `picoSwanEnabled` Gradle property — sibling plugins can gate their own
   Swan-only mutations on this flag without needing to parse plugin
   options.

### 15.7 What can and cannot be tested without a device

**Testable now (covered by the Jest suite):**

- `resolveOptions` defaults, overrides, and the xrMode/minSdk interaction.
- `insertLinesAfter`, `insertImportAfterPackage`, `removeBlock` helpers.
- `withPicoMainApplication` Kotlin + Java injection, idempotency, and
  toggling between PICO_OS6 and PICO_SWAN registration.
- `withPicoSettingsGradle` no-op cases, include/projectDir writing,
  idempotency, and path-update-in-place.
- `withPicoSwan` dependency block writing and in-place artifact updates.
- `xrModeToNativeEnum` mapping.

**Requires a PICO device / emulator (deferred):**

- `PicoCorePackage` actually being registered by a booted
  `MainApplication` (requires assembling the `picoDebug` APK).
- `PicoSwanRuntime.isInitialized()` flipping to `true` after boot on a
  Swan device.
- Manifest meta-data (`com.pico.xrMode`, `com.pico.swan.spatialContainer`)
  reaching the merged manifest — best checked via
  `aapt dump badging` on the assembled APK.
- Anything that depends on a real PICO Swan SDK binary (currently an
  extension seam, so it is correct that we cannot prove its behavior).

---

## 16. Launcher contract correctness (Phase A)

### 16.1 Why this is separate from Section 15

Section 15 added `xrMode` (which native runtime to register) and a set of
PICO-flavored manifest meta-data (`com.pico.xrMode`,
`com.pico.spatial.mode`, `com.pico.spatial.containerMode`,
`com.pico.swan.spatialContainer`). Those keys are **runtime hints** —
the PICO native runtime reads them once the app is launched.

None of them are what the **PICO OS 6 launcher** reads to decide whether
the APK should be enumerated as an immersive app. That decision is
governed by a separate, narrower contract documented in the PICO OpenXR
Mobile SDK (Ch. 4) and the Khronos OpenXR loader spec:

1. `<meta-data android:name="pvr.app.type" android:value="vr|mr|2d"/>`
   under `<application>`.
2. The launcher activity must declare an intent-filter that contains
   `android.intent.action.MAIN`, `android.intent.category.LAUNCHER`, plus
   `org.khronos.openxr.intent.category.IMMERSIVE_HMD` and the PICO
   launcher categories (`com.pico.intent.category.VR`, plus the legacy
   `com.picovr.intent.category.VR`).
3. A `<queries>` block listing the PICO system packages the immersive
   app needs to bind to once `targetSdkVersion >= 30`
   (`com.pico.os.systemui`, `com.pico.platform`).

Without these, an APK with `xrMode: 'pico-swan'` would still build and
boot, but the PICO launcher would either list it under "2D apps" or not
list it at all. Phase A closes that gap.

### 16.2 New plugin option

```ts
interface PicoPluginOptions {
  // ... §15 fields ...
  appType?: 'vr' | 'mr' | '2d';
}
```

| `appType` | `pvr.app.type` value | Immersive launcher categories | `<queries>` block |
| --------- | -------------------- | ----------------------------- | ----------------- |
| `'vr'`    | `vr`                 | yes                           | yes               |
| `'mr'`    | `mr`                 | yes                           | yes               |
| `'2d'`    | (not emitted)        | no                            | no                |

Default behavior:

- `xrMode: 'mobile'` → `appType: '2d'`
- `xrMode: 'pico-os6'` → `appType: 'vr'`
- `xrMode: 'pico-swan'` → `appType: 'vr'` (set explicitly to `'mr'` for
  passthrough-first MR experiences)

Precedence and edge cases:

- `appType` only takes effect when `buildVariant` produces a `pico` (or
  `dual`) flavor — `withPicoAndroidManifest` is the plugin that owns the
  flavor manifest, and the launcher contract rides on its writer. A
  `buildVariant: 'mobile'` build with `appType: 'vr'` is a silent no-op:
  no flavor manifest is written, so no immersive enumeration is offered.
  This is intentional. It keeps mobile-only builds clean and avoids
  hiding a mobile build behind an immersive launcher entry that has no
  PICO native runtime backing it.
- `appType: '2d'` with `xrMode: 'pico-os6'` is allowed and produces a
  PICO-flavored APK that is *not* immersive-enumerated. Use it when you
  want runtime hints to ship with the APK (so PICO OS knows the app was
  built with PICO awareness) without the launcher exposing it as an XR
  experience.
- The `xrMode` precedence is unchanged from §15 — `appType` is purely
  about launcher enumeration and never selects a native runtime.

### 16.3 Manifest mutation plan

Implemented in `packages/expo-pico-core/plugin/src/withPicoLauncherActivity.ts`
as the pure function `applyLauncherContract(manifest, options)`. Called
from `withPicoAndroidManifest` immediately before the flavor manifest is
written, so both single-flavor (`pico`) and `dual` source-set manifests
get the same contract.

| Mutation                                                              | Idempotency strategy                                                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `<meta-data android:name="pvr.app.type" .../>` (application scope)    | Upsert by `android:name`; updates value in place when `appType` toggles between `vr` and `mr`.                        |
| `<activity android:name=".MainActivity" tools:node="merge">` injection | Created if absent; reused if a `.MainActivity` entry already exists (e.g. seeded by another plugin).                  |
| `<intent-filter>` with MAIN + LAUNCHER + immersive categories          | Identified by the marker category `OPENXR_IMMERSIVE_HMD` (unique to this plugin); replaced wholesale on each apply.   |
| `<queries><package .../></queries>` for `com.pico.os.systemui`, `com.pico.platform` | Append-by-name; existing query packages are preserved.                                                                |

Why a separate intent-filter on `.MainActivity` rather than mutating the
existing one: the Android manifest merger has no clean way to add a
category to a *specific existing* intent-filter from a flavor manifest.
The standard pattern (used by Meta's Quest manifests, Google ARCore, and
PICO's own samples) is to declare a second intent-filter on the same
activity that *also* carries MAIN+LAUNCHER plus the additional
categories. Both intent-filters end up on the merged activity; the
PICO/OpenXR launcher matches the one with its category, and the standard
2D launcher matches the original. There is no observable downside.

### 16.4 Treatment of provisional metadata (§15 keys)

The provisional `com.pico.spatial.mode` and `com.pico.swan.spatialContainer`
meta-data emitted in §15 are **runtime hints, not the launcher
contract**. They remain emitted as-is for now because:

- They are read by the PICO Spatial SDK at runtime, not by the launcher.
- Removing them would break the §15 spatial mode plumbing without
  delivering any launcher-contract benefit.
- The constants file now carries an explicit comment on
  `MANIFEST_META.SPATIAL_MODE` clarifying that it is **not** the launcher
  contract, and pointing readers at this section.

The two surfaces are orthogonal: a Phase B branch can later rename or
remove the provisional spatial keys without touching the launcher
contract Phase A established here.

### 16.5 What Phase A intentionally does NOT cover

Out of scope for this branch (deferred to later phases):

- Platform SDK identity wiring: `pico_app_id` / `pico_app_key`
  string resources, `pico_merchant_id` / `pico_pay_key` for IAP, the
  `com.pico.loginpaysdk.UnityAuthInterface` and `…PicoSDKBrowser`
  activity declarations. (Phase B.)
- Hardware capability options: eye/face/body tracking permissions,
  spatial audio feature, foveated rendering, refresh-rate selection.
  (Phase C.)
- Real native bindings for the PICO Spatial / Platform SDKs — those
  remain extension seams (`PicoSwanRuntime`, `PicoOs6Runtime`).
- Per-activity intent-filter rewrites in the **main** AndroidManifest.
  Phase A only writes the flavor manifest, leaving the user's MainActivity
  declaration in their main manifest untouched.

### 16.6 OpenXR immersive enumeration (high-level)

When PICO OS 6 boots, its launcher and the OpenXR loader walk the
installed APK list and inspect each app's merged manifest:

1. The launcher checks `<application>` for
   `pvr.app.type=vr|mr` to decide whether the app belongs in the VR /
   Spatial section of the launcher UI.
2. The OpenXR loader (Khronos-compliant) scans every activity for an
   intent-filter that contains both `android.intent.action.MAIN` and
   `org.khronos.openxr.intent.category.IMMERSIVE_HMD`. Any match is
   eligible to be launched as an OpenXR immersive session.
3. The PICO launcher additionally requires
   `com.pico.intent.category.VR` (or the legacy `com.picovr.…` form on
   older OS releases) to surface the activity in the PICO Store /
   Library. We declare both for compatibility across PICO OS releases.
4. Once the user launches the app, PICO OS attempts to bind to system
   services for entitlement, spatial container negotiation, and runtime
   feature negotiation. The `<queries>` block declares the system
   packages the binder will look up under Android 11+ package
   visibility rules. Without those queries, the binders silently
   succeed-with-null-result and the app falls back to a non-spatial
   shell.

Phase A provides the manifest contract for steps 1–3 and the
`<queries>` block for step 4. Steps requiring app-side service binding
(Platform SDK init, Swan runtime providers) are extension seams that
Phase B and the Section 15 Swan runtime stubs will fill in.

### 16.7 Risks and mitigations

| Risk                                                                                                  | Mitigation                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User declares their own immersive intent-filter in their main manifest, leading to two filters with the same categories. | Manifest merger deduplicates categories by name within a single intent-filter, but cannot dedupe across filters. Two near-identical filters are harmless — both match the launcher query. Documented above. |
| User's main MainActivity has a different `android:name` than `.MainActivity`.                          | Manifest merger matches activities by fully-qualified class name. Our `tools:node="merge"` on `.MainActivity` resolves via the `package` attribute on `<manifest>` root. If the user has renamed MainActivity, our addition becomes an orphan activity declaration that the launcher will not touch. Documented as a known limitation; no warnings emitted because detection requires reading the user's own AndroidManifest, which the flavor manifest writer does not have access to. |
| Legacy `com.picovr.intent.category.VR` may be removed by a future PICO OS release.                     | Adding it costs nothing today and is harmless on newer releases. If/when PICO removes it, this constant can be deleted in a minor bump.                                                                     |
| `<queries>` block may eventually need more packages as sibling SDKs come online.                       | The current list is intentionally minimal (system UI + platform service). Sibling config plugins (`expo-pico-iap`, `expo-pico-account`, …) can extend `<queries>` from their own plugins — they do not have to round-trip through core. |

### 16.8 Validation matrix

| Validation                                                                 | When                       |
| -------------------------------------------------------------------------- | -------------------------- |
| `applyLauncherContract` produces correct meta/intent-filter/queries shapes | Jest (`__tests__/withPicoLauncherActivity.test.ts`, 18 cases) |
| Idempotency on repeat application                                          | Jest                       |
| Toggling `appType` between `vr` and `mr` updates rather than duplicates    | Jest                       |
| Pre-existing MainActivity intent-filters preserved                         | Jest                       |
| `<queries>` does not clobber unrelated existing queries                    | Jest                       |
| Merged AndroidManifest contains the expected `pvr.app.type` and categories | Requires `npx expo prebuild --clean` + `aapt dump badging` on the assembled APK (deferred — needs Android toolchain). |
| PICO launcher actually enumerates the APK as immersive                     | Requires a PICO OS 6 device or the Project Swan emulator (deferred). |

---

## 17. Platform SDK identity (Phase B)

### 17.1 Why this is separate from §15 and §16

Section 15 added the native runtime registration (`xrMode` →
`PicoCorePackage`). Section 16 added the launcher enumeration contract
(`appType` → `pvr.app.type` + immersive categories + `<queries>`).
Neither provides what the PICO Platform SDK (`CoreService.Initialize` /
`PlatformInitializer`) needs to authenticate the user, launch in-app
purchases, query leaderboards, or bind to PICO identity.

That set of resources — string IDs, keys, and two auxiliary activities —
is Phase B. Splitting it from §16 keeps the launcher contract review
lean (reviewers should not have to think about IAP merchant IDs to
approve immersive enumeration) and lets Phase B land after a consumer
has obtained real PICO developer console credentials.

### 17.2 New plugin API surface

```ts
interface PicoPluginOptions {
  // ... §15 / §16 fields ...
  platformService?: PicoPlatformServicePluginOptions;
}

interface PicoPlatformServicePluginOptions {
  picoAppId?: string;
  picoAppKey?: string;
  picoMerchantId?: string;   // IAP
  picoPayKey?: string;       // IAP
  foreign?: {
    picoAppId?: string;
    picoAppKey?: string;
    picoMerchantId?: string;
    picoPayKey?: string;
  };
  declareActivities?: boolean;   // default: true when any identity is set
}
```

All fields are optional. Behavior by population:

| Provided                                                  | Effect                                                                                                      |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Nothing                                                   | Phase B is a total no-op. Legacy `picoAppId` (top-level field) continues to work unchanged.                 |
| `picoAppId` + `picoAppKey`                                | Core identity. Writes `pico_app_id` / `pico_app_key` strings; declares the two login/browser activities.    |
| `picoMerchantId` + `picoPayKey`                           | Adds IAP identity. Writes `pico_merchant_id` / `pico_pay_key`. `hasIapIdentity` flips true.                 |
| `foreign.*`                                               | Writes the `_foreign` sibling resources. The CN and Global SDK variants read whichever set matches them.    |
| `declareActivities: false`                                | Suppresses the activity declarations even when identity is present. Use when the consumer ships their own.  |

Legacy compatibility: the top-level `picoAppId` option remains supported
and is now just sugar for `platformService.picoAppId`. When both are
provided, `platformService.picoAppId` wins — this matches the common
refactor pattern of moving scattered config into a dedicated sub-object.

Trimming: whitespace-only values are normalized to `null`, so
`picoAppId: '   '` does not flip `hasIdentity` to true.

### 17.3 Resource mutation plan

`withPicoStrings` (existing file, extended):

| Resource                    | Emitted when                                                 |
| --------------------------- | ------------------------------------------------------------ |
| `pico_app_id`               | Always (falls back to `''` when unset).                      |
| `pico_spatial_mode`         | Always (unchanged from §15).                                 |
| `pico_app_key`              | `platformService.picoAppKey` set.                            |
| `pico_app_id_foreign`       | `platformService.foreign.picoAppId` set.                     |
| `pico_app_key_foreign`      | `platformService.foreign.picoAppKey` set.                    |
| `pico_merchant_id`          | `platformService.picoMerchantId` set.                        |
| `pico_pay_key`              | `platformService.picoPayKey` set.                            |
| `pico_merchant_id_foreign`  | `platformService.foreign.picoMerchantId` set.                |
| `pico_pay_key_foreign`      | `platformService.foreign.picoPayKey` set.                    |

Upsert semantics: entries are updated in place across re-prebuilds.
Entries that had a value and are subsequently unset are **removed**, so a
refactor that drops a field doesn't leave a stale resource behind.

`applyPlatformServiceContract` (new file,
`plugin/src/withPicoPlatformService.ts`), invoked immediately after
`applyLauncherContract` in the flavor manifest writer:

| `<activity>`                                      | Attributes written                                                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `com.pico.loginpaysdk.UnityAuthInterface`         | `android:exported="false"`, `tools:node="merge"` — the PICO Platform SDK launches this activity internally for OAuth / identity-token exchange.  |
| `com.pico.loginpaysdk.component.PicoSDKBrowser`   | `android:exported="false"`, `tools:node="merge"` — in-app browser used by the auth and payment flows.                                              |

Both are upserted by `android:name` so re-applying doesn't duplicate.
Both are removed when `hasIdentity` goes from true to false between
prebuilds — this makes toggling the identity off a clean operation.

### 17.4 BuildConfig and gradle.properties

BuildConfig fields (added in this phase):

- `PICO_APP_KEY` (String) — mirrors `pico_app_key` at compile time; used
  by native code that wants to short-circuit on empty key without
  round-tripping through `R.string`.
- `PICO_APP_TYPE` (String) — mirrors the `appType` option so native code
  can branch on `vr` / `mr` / `2d` without parsing the manifest.
- `PICO_HAS_PLATFORM_IDENTITY` (boolean) — derived flag; true iff at
  least one identity field is populated.
- `PICO_HAS_IAP_IDENTITY` (boolean) — derived; true iff both merchant ID
  and pay key are populated (in either region).

Gradle properties (mirrors of the BuildConfig flags):
`picoAppKey`, `picoAppType`, `picoPlatformIdentityEnabled`,
`picoIapIdentityEnabled`. Sibling config plugins gate their own
identity-dependent mutations on these.

### 17.5 Runtime JS surface

```ts
export function getAppType(): 'vr' | 'mr' | '2d';
export function hasPlatformIdentity(): boolean;
export function hasIapIdentity(): boolean;

interface PicoRuntimeInfo {
  // ... existing ...
  appType: PicoAppType;
  picoAppKey: string | null;
  hasPlatformIdentity: boolean;
  hasIapIdentity: boolean;
}
```

`expo-pico-account` and `expo-pico-iap` are expected to short-circuit on
`hasPlatformIdentity()` / `hasIapIdentity()` before any native init, so
an app in dev with no credentials degrades cleanly instead of crashing.

### 17.6 What Phase B intentionally does NOT cover

- **Real `CoreService.Initialize` native bindings.** `PicoOs6Runtime`
  remains a documented seam. When PICO ships stable Kotlin bindings for
  the Platform SDK, the seam's body is replaced with a real call that
  reads `R.string.pico_app_id` and `R.string.pico_app_key`. No plugin
  change is required at that point.
- **Hardware capability options** (eye / face / body tracking, spatial
  audio, foveation, refresh rates). That is Phase C.
- **Sibling package API surfaces** (expo-pico-account / -iap / -rtc /
  etc.). Those remain stubs, but the gating flags they need
  (`hasPlatformIdentity`, `hasIapIdentity`) are now available.

### 17.7 Risks and mitigations

| Risk                                                                                         | Mitigation                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Consumer checks `picoAppId` / `picoAppKey` into version control.                             | Example app.config reads from env vars. Docs call this out as the expected pattern. The plugin does not emit warnings — the consumer owns that policy.                                                             |
| Consumer provides only one half of an identity pair (e.g. `picoAppId` but no `picoAppKey`). | `hasIdentity` still flips true (because *any* field is set) so the activities land and the consumer sees a clear "auth failed" error at runtime rather than a silent no-op. `hasIapIdentity` correctly stays false until both halves are present. |
| `com.pico.loginpaysdk.UnityAuthInterface` class name may change in a future SDK revision.    | The names are exposed as constants (`PLATFORM_SERVICE_ACTIVITIES.AUTH`, `.BROWSER`). A minor plugin bump can rename them without touching consumer config.                                                         |
| PICO SDK region-selection mechanism is not fully documented.                                 | The `foreign` sub-object is an additive seam. Consumers who only ship one region simply omit it. When the region-selection rule is documented, the resolver can be updated to honor it without a breaking change. |

### 17.8 Validation matrix

| Validation                                                                              | When                                                                 |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `resolveOptions` platform-service derivations (`hasIdentity`, `hasIapIdentity`, trimming) | Jest (`__tests__/withPicoPlatformService.test.ts` + resolveOptions suite) |
| `applyPlatformServiceContract` activity shape + attributes                               | Jest                                                                 |
| Activities removed on identity toggle-off                                                | Jest                                                                 |
| `withPicoStrings` emits + cleans up CN/Global + IAP resources                            | Jest (`__tests__/withPicoStrings.test.ts`, 14 cases)                |
| Unrelated string / activity entries preserved                                            | Jest                                                                 |
| Merged manifest actually carries the two activities                                      | Requires `npx expo prebuild --clean` + `aapt dump xmltree` on the APK (deferred). |
| Platform SDK actually authenticates / transacts                                          | Requires real PICO developer-console credentials + device (deferred).|

---

## 18. Hardware capability declarations (Phase C)

### 18.1 Why this is separate from §15–§17

The three prior phases cover:

- §15: which native runtime boots (`xrMode` → `PicoCorePackage`).
- §16: how the launcher enumerates the APK (`appType` → `pvr.app.type`).
- §17: how the Platform SDK identifies the app (`platformService` → strings + activities).

None of those answer **what hardware features the device must or may have**. Phase C is the hardware capability declaration layer: a flat set of booleans (plus one array) that emit `uses-feature`, `uses-permission`, and `<meta-data>` entries into the PICO-flavor manifest.

### 18.2 New plugin options

```ts
interface PicoPluginOptions {
  // ... §15–§17 fields ...
  eyeTracking?: boolean;              // default false
  faceTracking?: boolean;             // default false
  bodyTracking?: boolean;             // default false  (seam — key unconfirmed)
  spatialAudio?: boolean;             // default false  (seam — key unconfirmed)
  foveatedRendering?: boolean;        // default false  (seam — key unconfirmed)
  highSamplingRateSensors?: boolean;  // default false  (AOSP permission — confirmed)
  refreshRates?: number[];            // default []     (seam — meta-data key unconfirmed)
}
```

Every capability is opt-in. Nothing is emitted unless the consumer sets the field. PICO store reviewers historically flag APKs that declare hardware capabilities they do not use, so the defaults are deliberately empty.

### 18.3 What each capability emits

Implemented in `packages/expo-pico-core/plugin/src/withPicoCapabilities.ts`
as the pure function `applyCapabilityContract(manifest, options)`. Called from `withPicoAndroidManifest` after `applyPlatformServiceContract`.

| Option                    | `uses-feature` (required=false)         | `uses-permission`                                 | `<meta-data>`                              |
| ------------------------- | --------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| `eyeTracking`             | `pico.hardware.eyetracking`             | `com.picovr.permission.EYE_TRACKING`              | —                                          |
| `faceTracking`            | `pico.hardware.facetracking`            | `com.picovr.permission.FACE_TRACKING`             | —                                          |
| `bodyTracking`            | `pico.hardware.bodytracking` *(seam)*   | `com.picovr.permission.BODY_TRACKING` *(seam)*   | —                                          |
| `spatialAudio`            | `pico.hardware.spatialaudio` *(seam)*   | —                                                 | —                                          |
| `foveatedRendering`       | `pico.hardware.foveation` *(seam)*      | —                                                 | `com.pico.foveation.enabled=true` *(seam)* |
| `highSamplingRateSensors` | —                                       | `android.permission.HIGH_SAMPLING_RATE_SENSORS`   | —                                          |
| `refreshRates: [72,90]`   | —                                       | —                                                 | `com.pico.refreshRates="72,90"` *(seam)*   |

All `uses-feature` entries are emitted with `android:required="false"`. This matches how the existing `handTracking` / `passthrough` features are declared in §15 and ensures a device that lacks the capability (e.g. a PICO 4 without eye-tracking) still installs the APK. Consumers gate runtime usage via `context.getPackageManager().hasSystemFeature("pico.hardware.eyetracking")`.

### 18.4 Why some keys are marked *(seam)*

The audit report (summarized in §15.5 of the prior doc work) found that several of these key names are not confirmed in open PICO developer documentation — the PICO developer portal pages that would document them are JavaScript-rendered and only returned navigation skeletons to WebFetch. The best-known keys are used (following the `pico.hardware.*` pattern for features and the `com.picovr.permission.*` pattern for permissions), and each constant carries an inline comment flagging the uncertainty.

Rationale for shipping seam keys anyway:

1. Declarations PICO OS does not recognize are silently ignored — there is no install-time penalty for a mis-named feature.
2. When PICO publishes the canonical names, a single constants-file patch updates them without touching consumer `app.config.ts`.
3. Keeping the options in the plugin's public surface today means consumers can begin wiring their app.config for these capabilities now and get automatic correctness when the constants are confirmed.

### 18.5 Resolver semantics

`resolveOptions` performs two pieces of input hygiene on `refreshRates`:

1. Filters out non-finite and non-positive entries. `refreshRates: [72, 0, -90, NaN, 120]` → `[72, 120]`.
2. Rounds fractional rates to the nearest integer. `refreshRates: [72.5, 120.2]` → `[73, 120]`.

Both steps are defensive — PICO OS almost certainly parses the meta-data as integers, and a fractional or negative Hz value would either be ignored or interpreted incorrectly. Filtering in the resolver keeps that complexity out of the manifest writer and out of tests that consume the resolver's output.

### 18.6 Idempotency and toggle-off cleanup

Each capability's manifest entries are keyed by `android:name` and upserted in place on repeat apply. Toggling a capability off between prebuilds **removes** its entries — eye-tracking permission does not linger after the consumer drops `eyeTracking: true` from their config.

The one exception is `<uses-permission>` entries that carry `tools:node="remove"`: the telephony / SMS permission-strip entries written by `buildPicoManifest` are preserved across capability toggles. Without that carve-out, turning off a capability could accidentally re-enable phone permissions — a subtle regression.

### 18.7 What Phase C does NOT cover

- **Runtime native bindings.** The eye-tracking provider, face-tracker callbacks, refresh-rate setter, and spatial-audio mixer remain extension seams in `PicoOs6Runtime` / sibling packages. Phase C only declares that the app *may* use the capability; actually calling into the corresponding PICO SDK surface is a native-binding task.
- **Feature-grouped permission bundles.** For example, PICO Motion Tracker body-tracking likely requires one or more companion permissions (`BODY_TRACKING_ACCEL`, etc.). Phase C emits the single best-known permission; multi-permission feature bundles are a refinement for when the canonical list is published.
- **Device-class gating.** If `eyeTracking: true` is set on a consumer config that also targets PICO Neo3 (a device without eye-tracking hardware), the plugin does not warn. The `android:required="false"` attribute already makes the APK installable on Neo3; runtime code is expected to branch on `hasSystemFeature`. Adding plugin-side validation is a larger scope project since it requires consulting `targetDevices` and maintaining a device-capability matrix.
- **Runtime JS API for capability introspection.** The Android convention is `PackageManager.hasSystemFeature()`. Adding a `getDeclaredCapabilities()` JS helper would be a thin wrapper over that — deferred until a concrete consumer needs it. BuildConfig fields for these flags are also deliberately omitted to keep the compile-time surface minimal.

### 18.8 Risks and mitigations

| Risk                                                                                                 | Mitigation                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A seam key diverges from the eventual canonical name, producing a manifest entry the OS ignores.    | Each seam emits its entry with `required="false"`. A mis-named feature is a no-op rather than an install failure. Constants update in a minor plugin bump.      |
| Consumer enables `eyeTracking` without checking `hasSystemFeature` at runtime and crashes on a PICO 4. | `android:required="false"` means install succeeds; the app must check at runtime. Documented in §18.3 and in the `eyeTracking` JSDoc comment.                  |
| PICO review flags over-declared features.                                                            | All capabilities default to `false`. Consumers opt in per capability.                                                                                           |
| Refresh-rate meta-data format is `min-max` rather than `csv` on a future PICO OS release.            | Single meta-data entry, easy to change the renderer without touching option shape. Consumers continue passing `number[]`; the plugin owns the serialization.    |

### 18.9 Validation matrix

| Validation                                                            | When                                                                  |
| --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Each capability emits exactly the expected feature / permission / meta | Jest (`__tests__/withPicoCapabilities.test.ts`, 17 cases)             |
| `uses-feature` entries all carry `required="false"`                   | Jest                                                                  |
| Refresh-rate filtering and rounding                                   | Jest                                                                  |
| Idempotency across three consecutive applies                          | Jest                                                                  |
| Toggling a capability off removes its entries                         | Jest                                                                  |
| `tools:node="remove"` telephony entries preserved when toggling off   | Jest                                                                  |
| Combined capability fan-out (all enabled simultaneously)              | Jest                                                                  |
| Merged manifest actually carries the entries after prebuild           | Requires `npx expo prebuild --clean` + `aapt dump xmltree` (deferred) |
| Runtime behavior on real PICO 4 Pro hardware                          | Requires device with eye / face tracking (deferred)                   |

---

## 19. Platform hardening + renderer-agnostic plugin contract (Phase E)

### 19.1 Why this phase

Three concerns left over from the original Viro-style audit and from the
"works with any renderer" design goal:

1. **`<uses-native-library>` for `libopenxr_loader.so`.** Required once
   `targetSdkVersion >= 31` per AOSP. Without it, `System.loadLibrary`
   calls the OpenXR loader hits a silent fallback and the immersive
   session fails to initialize.
2. **NDK ABI filter for the PICO flavor.** PICO 4 / 4 Ultra / Swan are
   all 64-bit ARM. Shipping `armeabi-v7a` is ~30% APK bloat for zero
   install coverage; x86 is unsupported. The flavor should be pinned to
   `arm64-v8a` while leaving `mobile` unconstrained.
3. **Prebuild diagnostics for common misconfigs.** The plugin's
   three-axis option space (`xrMode × appType × platformService`) has
   combinations that build successfully but behave non-obviously — e.g.
   an immersive `xrMode` without `picoAppId` ships an APK that silently
   fails every Platform SDK call at runtime. These are soft-errors at
   prebuild rather than runtime surprises.

This phase is also where the plugin's renderer-agnostic contract gets
made explicit: nothing the plugin does favors `@reactvision/react-viro`
over Unity-as-a-Library over a custom OpenXR renderer. All three consume
the same manifest + Gradle output.

### 19.2 New plugin options

```ts
interface PicoPluginOptions {
  // ... Phases A–D ...
  ndkAbiFilters?: boolean;          // default true when xrMode !== 'mobile'
  openXrLoaderDeclaration?: boolean; // default true when xrMode !== 'mobile'
}
```

Both options track `xrMode` so the common case (immersive PICO build)
needs no explicit opt-in, while escape hatches exist for:

- Shipping a 32-bit companion APK alongside the immersive build for CI
  / legacy reasons → `ndkAbiFilters: false`.
- Using a renderer whose own runtime bundles a non-system OpenXR loader
  → `openXrLoaderDeclaration: false`. This is rare in practice;
  `@reactvision/react-viro` and Unity-as-a-Library both use the system
  loader.

### 19.3 What lands in the flavor manifest

`applyCapabilityContract` now also writes
`<uses-native-library>` entries for every library in
`PICO_NATIVE_LIBRARIES`. Currently a single entry:

```xml
<uses-native-library
    android:name="libopenxr_loader.so"
    android:required="false" />
```

`required="false"` keeps the APK installable on PICO hardware that
predates the loader library name and on non-PICO Android targets used
for development builds. Consumers still guard `System.loadLibrary` at
runtime (the standard OpenXR pattern).

### 19.4 What lands in `app/build.gradle`

`renderFlavorBlock` now emits `ndk { abiFilters 'arm64-v8a' }` inside
the `pico` flavor (and the `dual` flavor when `buildVariant: 'dual'`):

```gradle
productFlavors {
    mobile { dimension "device" }
    pico {
        dimension "device"
        minSdkVersion 32
        targetSdkVersion 34
        ndk { abiFilters 'arm64-v8a' }
    }
}
```

The `mobile` flavor is deliberately never touched. A phone/tablet
build pulling this plugin keeps whatever `abiFilters` the app had,
or none at all.

### 19.5 Prebuild diagnostics

`withPicoDiagnostics` runs immediately after `withPicoNewArchCheck` and
emits `WarningAggregator.addWarningAndroid` for seven misconfig
patterns, each with a user-visible consequence and a suggested fix:

| # | Condition                                                                                         | Consequence                                                                         |
| - | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1 | `xrMode !== 'mobile'` + `appType !== '2d'` + no `picoAppId`                                     | Platform SDK calls all fail with "SDK unavailable" at runtime.                      |
| 2 | `xrMode !== 'mobile'` + `appType === '2d'`                                                       | APK builds but does not appear in the PICO immersive launcher.                      |
| 3 | `buildVariant === 'mobile'` + `appType !== '2d'`                                                 | Flavor manifest never written; launcher categories and pvr.app.type never land.     |
| 4 | `xrMode === 'mobile'` + any of handTracking / passthrough / sceneUnderstanding / eye / face / body / foveation / boundary / sceneMesh toggled on | Toggles have no effect; flavor manifest isn't written. Lists the enabled toggles by name. |
| 5 | `picoSwan.swanRuntimeProject` set + `xrMode !== 'pico-swan'`                                     | `settings.gradle` mutation skipped; the subproject path is ignored.                 |
| 6 | `xrMode === 'mobile'` + non-empty `refreshRates`                                                 | Rates are declared but never emitted because the flavor manifest isn't written.     |
| 7 | Exactly one of `picoMerchantId` / `picoPayKey` set (per region)                                  | IAP calls will fail at runtime. Reports which region(s) are partial.                |

All are warnings, never errors. The pattern matches Viro's
`WarningAggregator` soft-check and the existing `withPicoNewArchCheck`.

### 19.6 Renderer compatibility matrix

The plugin is renderer-agnostic. Confirmed compositions:

| Renderer                                | Android surface             | OpenXR loader | PICO plugin compat                                                            |
| --------------------------------------- | --------------------------- | ------------- | ----------------------------------------------------------------------------- |
| `@reactvision/react-viro`               | ViroReact native view       | System loader | ✅ (example app renderer; ships immersive on PICO + Meta Quest from one APK)  |
| Unity-as-a-Library                      | Unity-managed               | System loader | ✅ (Unity's own PICO integration module expects the system loader declaration) |
| Custom renderer with bundled loader     | Custom                      | Bundled       | ✅ with `openXrLoaderDeclaration: false`                                       |
| Pure 2D RN                              | View hierarchy              | —             | ✅ under `xrMode: 'mobile'` (plugin is a mostly-no-op)                         |

There is no runtime or renderer code in `expo-pico-core`. Sibling
packages (account / IAP / notifications / rtc / rooms / subscription /
storage / social / achievements / leaderboards) are Expo Modules that
bind to PICO Platform SDK surfaces independently of the rendering
stack — a Viro app calls `getUserProfile()` from `expo-pico-account`
the same way any other app does.

### 19.7 ReactVision/Viro — integration notes

1. Install `@reactvision/react-viro` and the `mikevocalz/virocore`
   `pico-support` branch overrides (PICO controller profiles, foveation,
   16KB ELF alignment).
2. Keep `expo-pico-core` listed **before** `@reactvision/react-viro` in
   the `plugins` array. The PICO plugin's flavor manifest / launcher
   categories must land first so Viro's manifest merges land on top.
3. `openXrLoaderDeclaration` default `true` is the correct setting —
   Viro's OpenXR backend uses the system loader (`libopenxr_loader.so`).
4. `ndkAbiFilters: true` is also correct — Viro ships `arm64-v8a` on
   Android by default; the filter enforces that the final PICO APK
   doesn't accidentally include a non-functional 32-bit slice from
   another dep.
5. `xrMode: 'pico-os6'` or `'pico-swan'` tells the plugin to emit PICO
   launcher categories; Viro's OpenXR runtime is queried via the
   ByteDance interaction profiles + `XR_FB_foveation` extension our
   fork enables. The `uses-feature` declarations emitted by Phases A /
   C / D are what the OpenXR runtime queries at session-create time.

### 19.8 Validation matrix

| Validation                                                              | When                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `renderFlavorBlock` emits `ndk { abiFilters 'arm64-v8a' }` correctly    | Jest (`__tests__/withPicoGradle.test.ts`, 6 Phase E cases)         |
| `applyCapabilityContract` emits `<uses-native-library>` + idempotency   | Jest (`__tests__/withPicoCapabilities.test.ts`, 5 Phase E cases)   |
| Every diagnostic fires on the right misconfig                            | Jest (`__tests__/withPicoDiagnostics.test.ts`, 16 cases)           |
| The actual built APK carries the filter and the `<uses-native-library>` | Requires `npx expo prebuild --clean` + `aapt dump xmltree` / `aapt dump badging` (deferred) |
| Viro boots immersive under `xrMode: 'pico-swan'`                        | Verified on-device via `example/src/scene/PicoSceneRoot.tsx`       |

---

## 20. Runtime diagnostics (Phase F)

### 20.1 Why runtime diagnostics

Phase E added prebuild warnings: misconfigs visible at
`npx expo prebuild` time. That catches configuration mistakes before
the APK ships.

What it *can't* catch: state that only exists at runtime. Examples:

- App manifest declares `pico.hardware.eyetracking` (Phase C) but the
  running device is a PICO 4 base model that lacks eye-tracking
  hardware.
- App was built with `xrMode: 'pico-swan'` but is being sideloaded onto
  a mobile phone for screenshot generation.
- `RECORD_AUDIO` is declared (via the RTC sibling) but the user denied
  the runtime prompt so voice channels will fail silently.
- `PicoSwanRuntime.initialize` never ran because `MainApplication.kt`
  lost the `PicoCorePackage` line during a merge conflict.

Phase F adds a runtime pass that compares what the plugin *declared*
at build time against what `PackageManager` and the native runtime
actually report, and surfaces the diff as a structured diagnostic
report.

### 20.2 New public API

```ts
import {
  getPicoDiagnostics,
  buildDiagnosticsReport,
  readBuildTimeFacts,
  readRuntimeFacts,
  formatDiagnostics,
  type PicoDiagnosticsReport,
  type DiagnosticFinding,
  type DiagnosticSeverity,
} from '@expo-pico/core';

const report = await getPicoDiagnostics();
if (report.summary.hasError) {
  console.error(formatDiagnostics(report));
}
```

`PicoDiagnosticsReport` exposes a summary boolean triple
(`hasError` / `hasWarning` / counts), an ordered `findings` array
(errors before warnings before info), and the raw
`declaredFeatures` / `declaredPermissions` / `systemFeatureHits`
objects so consumers can build their own views.

### 20.3 Native additions

`ExpoPicoModule.kt` gains three async functions, all read-only:

| Kotlin method                              | JS name                   | Backs                                                                              |
| ------------------------------------------ | ------------------------- | ---------------------------------------------------------------------------------- |
| `PicoRuntimeCapabilities.hasSystemFeature` | `hasSystemFeature(name)`  | `PackageManager.hasSystemFeature(name)` — probes a single feature.                 |
| `PicoRuntimeCapabilities.getDeclaredFeatures` | `getDeclaredFeatures()` | Reads `PackageInfo.reqFeatures` for the running app — returns every `<uses-feature>` in the merged manifest. |
| `PicoRuntimeCapabilities.getDeclaredPermissions` | `getDeclaredPermissions()` | Reads `PackageInfo.requestedPermissions` + runtime grant state.       |

All three are defensive: a thrown SecurityException / null PackageManager
falls through to an empty list or `false`. No new Kotlin dependencies.

### 20.4 Reducer contract

`buildDiagnosticsReport(build, runtime)` is pure and synchronous. It
takes the two fact objects and emits the report. Classification
summary:

| Finding                                      | Severity | Condition                                                                                                     |
| -------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `identity.missing`                           | error    | Immersive xrMode + non-2d appType + no platform identity.                                                    |
| `feature.missing:<name>`                     | error    | Required `<uses-feature>` entry not reported by device.                                                      |
| `build-device-mismatch`                      | warning  | Pico-flavor APK running on a non-PICO device.                                                                |
| `mobile-on-pico-device`                      | warning  | Mobile-flavor APK on PICO hardware.                                                                          |
| `feature.optional-missing:<name>`            | info     | Optional `<uses-feature>` missing at runtime. Non-fatal; app is expected to gate with `hasSystemFeature`.    |
| `swan.uninitialized` / `os6.uninitialized`   | info     | Runtime init seam has not run yet. Normal during early app boot.                                             |
| `permission.ungranted:<name>`                | info     | Runtime-dangerous permission declared but not granted. Skipped for tools:node="remove" telephony leftovers. |

Findings are sorted: `error` → `warning` → `info` → `ok`, then by id
for stability.

### 20.5 Pure-reducer test surface

Native calls are not available in the Jest env, so the tests drive
`buildDiagnosticsReport` with synthetic `BuildTimeFacts` and
`RuntimeFacts`. 18 cases cover: clean baselines (immersive + mobile),
identity errors, runtime-init info, build/device mismatch, required vs
optional feature hits, telephony-strip permission skipping, severity
ordering, and `formatDiagnostics` output.

The live `getPicoDiagnostics` entry point composes `readBuildTimeFacts`
(sync, Constants-only) + `readRuntimeFacts` (async, three PackageManager
probes) + `buildDiagnosticsReport`. Each is independently exported for
consumers who want to cache the reducer input or swap in a mock.

### 20.6 Example app integration

`example/src/scene/DiagnosticsPanel.tsx` renders a ScrollView card
between the 3D scene and the `ValidationHarness`. On mount it calls
`getPicoDiagnostics()` and shows:

- A summary line (errors? warnings? feature / permission / missing
  counts).
- One row per finding with severity, id, message, and optional hint.
- The raw `formatDiagnostics` output at the bottom for copy-paste.

A "Refresh" button re-reads the report — useful after granting a
runtime permission or after the Swan runtime finishes initializing.

### 20.7 What Phase F does NOT cover

- **Pre-auth probes of PICO Platform SDK state.** The report stops at
  manifest-level declarations and PackageManager features; it doesn't
  call `getUserProfile` / `isAccountAvailable` / etc. That is the
  sibling packages' job and will remain so — Phase F reads public
  Android surfaces only.
- **OpenXR loader health.** Declaring `libopenxr_loader.so` (Phase E)
  does not verify the loader actually dynamically links at app boot.
  A Phase G check could run `System.loadLibrary` probe, but PICO's own
  SDK handles that load with a proper error path; re-probing would
  just duplicate work.
- **Historical diagnostics / telemetry.** Reports are stateless —
  each call re-reads. Consumers who want to track drift over time
  should persist the reports themselves.

### 20.8 Validation matrix

| Validation                                                         | When                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------- |
| `buildDiagnosticsReport` pure-reducer coverage                     | Jest (`src/__tests__/diagnostics.test.ts`, 18 cases)           |
| `formatDiagnostics` output                                         | Jest                                                           |
| Native PackageManager probes actually fire                         | Requires the example app on a device (deferred)                |
| DiagnosticsPanel UI layout on PICO vs. mobile                      | Requires the example app on each target (deferred)             |

---

## 21. `expo-pico-doctor` CLI (Phase G)

### 21.1 Rationale

Phase E added prebuild diagnostics — warnings that fire during `npx expo prebuild`. That catches misconfigs, but only at the point where the developer is already spending 30+ seconds on the prebuild pipeline.

Phase G extracts the same checks into a standalone CLI, `expo-pico-doctor`, so the diagnostic can run:

- Sub-second as a pre-commit hook.
- In a GitHub Actions PR gate without running the full Android toolchain.
- In a VS Code task / tasks.json integration before the developer kicks off a real build.

The checks are identical — both entry points share the same pure `runDiagnosticChecks(options)` reducer in `plugin/src/withPicoDiagnostics.ts`. This phase explicitly refactors that file so the same check list powers both the config plugin and the CLI.

### 21.2 Usage

```bash
# Run against the current project (defaults to cwd)
npx expo-pico-doctor

# Run against an explicit project root
npx expo-pico-doctor --project ./apps/my-pico-app

# Machine-readable output (for editor / CI consumption)
npx expo-pico-doctor --json

# Treat warnings as gating (exit code 1). Useful in CI.
npx expo-pico-doctor --fail-on-warning
```

Exit codes:

| Code | Meaning                                                                 |
| ---- | ----------------------------------------------------------------------- |
| 0    | No errors. Warnings may still have printed.                             |
| 1    | At least one error, OR `--fail-on-warning` and >= 1 warning.            |
| 2    | Could not locate or parse the Expo config / plugin entry.               |

### 21.3 Config loading

Doctor tries two loaders in order:

1. **`@expo/config.getConfig(projectRoot, { skipPlugins: true })`** — the canonical Expo loader. Handles `app.config.ts`, `app.config.js`, and `app.json` merging. `skipPlugins: true` skips plugin *resolution* to avoid requiring every plugin's compiled JS just to read the plugin list — but empirically, this also strips the raw plugins array on some Expo versions, so:
2. **Filesystem fallback** — reads `app.config.json` or `app.json` directly and parses the `plugins` array out.

Consequence: for projects using `app.config.ts`, doctor may or may not see the plugins array depending on how `@expo/config` handles it. Workaround: pipe the resolved config through `npx expo config --type prebuild --json` once, drop the output at `/tmp/app.config.json`, and point doctor at `/tmp`. Documented in `RELEASING.md` and in the CLI help text.

We do not ship an embedded TypeScript transpilation pipeline (would add a ~10 MB `esbuild` dep) — the workaround above is cheap and more robust than an in-process TS loader.

### 21.4 Output shape

**Pretty (default):**

```
expo-pico-doctor
  project: /repo/apps/my-pico-app
  xrMode: pico-swan   appType: vr   buildVariant: pico

WARN    identity.missing
        xrMode 'pico-swan' is an immersive build but no picoAppId / platformService.picoAppId is set. …

1 warning
```

**JSON (`--json`):**

```json
{
  "projectRoot": "...",
  "resolvedOptions": { "xrMode": "pico-swan", "appType": "vr", ... },
  "findings": [ { "id": "identity.missing", "severity": "warning", "message": "..." } ],
  "summary": { "errorCount": 0, "warnCount": 1, "infoCount": 0 }
}
```

Colors are `NO_COLOR`- / `FORCE_COLOR`-aware. TTY autodetects; piped output stays plain.

### 21.5 Refactor note

`withPicoDiagnostics` is now a ~10-line wrapper that calls the shared `runDiagnosticChecks(options)` reducer and forwards each finding to `WarningAggregator.addWarningAndroid`. The plugin prebuild behavior is unchanged — the existing 16 `withPicoDiagnostics.test.ts` cases continue to pass against the wrapper.

The `DiagnosticCheckFinding` shape intentionally mirrors Phase F's runtime `DiagnosticFinding` shape (`id`, `severity`, `message`) so the runtime `DiagnosticsPanel` and the CLI can render from the same structure. Downstream tooling that wants to aggregate build-time + runtime findings into a single view can do so without a translation layer.

### 21.6 Validation matrix

| Validation                                                             | When                                                           |
| ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| `runDiagnosticChecks` pure reducer correctness                         | Jest (`__tests__/runDiagnosticChecks.test.ts`, 11 cases)       |
| CLI arg parsing + exit codes + output shape                            | Jest spawn tests (`__tests__/doctor-cli.test.ts`, 8 cases)     |
| Built binary runs green against a clean fixture                        | CI `Doctor self-smoke` step                                    |
| Pretty vs JSON output finding content matches                          | Jest spawn test (same `id`s in both)                           |
| `--fail-on-warning` flips exit codes                                   | Jest spawn test                                                |
| TypeScript config handling via `npx expo config` pipe                  | Documented workaround (RELEASING.md); requires full Expo SDK in the project — deferred |

---

## 22. Reflection-based PICO Platform SDK detection (Phase J)

### 22.1 The problem

Through Phase I, sibling packages (`expo-pico-account`, `expo-pico-iap`, and eight others) each hard-coded `isPlatformSdkAvailable(): false`. Even a consumer who dropped a real PICO Platform SDK AAR into their `android/app/libs/` directory saw the same behavior: every sibling module reported `SDK unavailable` and every public API threw `notImplementedError`. The SDK AAR was effectively unreachable from app code.

There was also no app-wide answer to "is any PICO Platform SDK live in this process?" A consumer had to probe each sibling individually to find out.

### 22.2 What Phase J adds

A shared reflection-based detector in `expo-pico-core` that:

- Probes a curated list of PICO Platform SDK entry classes (`com.pvr.platform.sdk.PlatformSDK`, `com.pvr.platform.sdk.account.AccountAPI`, `com.pvr.iap.sdk.IAPClient`, `com.pvr.push.sdk.PushSDK`, `com.pvr.rtc.sdk.RtcEngine`, and the Platform SDK's per-service APIs) via `Class.forName(name, false, classloader)`.
- Reads the SDK version string from `com.pvr.platform.sdk.BuildConfig.VERSION_NAME` (with fallback candidates) via static field reflection.
- Exposes both a coarse `platformSdkPresent` boolean and a fine-grained per-surface probe report as Expo Module constants + async functions.
- Uses `initialize = false` on `Class.forName` so the probe itself doesn't trigger native `.so` loads the probed class might lazy-load on first use (important for running a PICO-flavor APK on a mobile emulator that has the AAR but not its native libraries).
- Swallows `Throwable` — not just `ClassNotFoundException` — so partially-linked SDKs (AAR present, native libs missing, verifier errors) degrade to `false` rather than crashing the host process.

### 22.3 Native API

```kotlin
object PicoPlatformSdkDetector {
    fun probeAny(vararg candidates: String): Boolean
    fun findAvailable(vararg candidates: String): String?
    fun readStringField(className: String, fieldName: String): String?
    fun readVersion(): String?
    fun isAnyPlatformSdkPresent(): Boolean
    fun buildProbeReport(): Map<String, Boolean>
}
```

Used by `ExpoPicoModule`:

- Constant `platformSdkPresent` — aggregate broad probe evaluated once at module init.
- Constant `platformSdkVersion` — best-effort version string, evaluated once at module init.
- Async function `getPlatformSdkProbe()` — fine-grained per-surface map (account / iap / achievements / leaderboards / rooms / social / storage / subscription / notifications / rtc).

### 22.4 JS API

```ts
import {
  isPlatformSdkPresent,
  getPlatformSdkVersion,
  getPlatformSdkProbe,
  type PicoPlatformSdkProbe,
} from '@expo-pico/core';

if (isPlatformSdkPresent()) {
  console.log(`PICO Platform SDK ${getPlatformSdkVersion() ?? '(version unknown)'} is live`);
  const probe = await getPlatformSdkProbe();
  // probe.account, probe.iap, probe.notifications, ...
}
```

`PicoRuntimeInfo` (the return value of `getPicoRuntimeInfo()`) now includes `platformSdkPresent: boolean` and `platformSdkVersion: string | null`.

Typing note: `getPlatformSdkProbe` normalizes the raw native map to a strict `PicoPlatformSdkProbe` shape — every documented surface has an explicit `false` when absent rather than `undefined`, so downstream code can destructure without optional-chaining every field. Unknown keys the native module returns (future SDK surfaces not yet in the typed shape) are dropped from the typed result; consumers who want the raw map can call `ExpoPicoModule.getPlatformSdkProbe()` directly.

### 22.5 Sibling packages are unchanged in this phase

Siblings already carry their own per-service `Class.forName` probes (each sibling's `*Utils.kt`). Phase J does **not** migrate them to depend on `PicoPlatformSdkDetector` because:

1. Siblings don't share a Gradle compile classpath with `expo-pico-core` — Expo Modules autolinking composes them at the consuming app's build time, not at library build time. A hard `implementation project(':expo-pico-core')` dep in each sibling's `android/build.gradle` would only work under specific autolinking paths and is fragile across Expo SDK minor versions.
2. Sibling probes already work correctly at runtime. The bug Phase J closes is different: consumers had no way to ask "is any PICO SDK live?" without probing each sibling individually.

The layering is now:

- `expo-pico-core`'s detector answers the app-wide presence question and aggregates per-surface probes for UI / diagnostics.
- Each sibling's probe answers "is **my** specific SDK surface wired?" for use inside that sibling's bridge methods.

When a future phase ships a common Gradle integration path (e.g. publishing `expo-pico-core` as a regular AAR through Maven Local during dev), siblings can migrate to the shared detector. That migration is mechanical (each sibling's Utils collapses to ~8 lines) and can land one sibling per PR without breaking anything.

### 22.6 DiagnosticsPanel integration

The example's Phase F `DiagnosticsPanel` now renders the probe report on its summary line. Running on a device without the PICO SDK AAR shows `platform sdk: absent` and an empty live-surface list; running on a device or build with the AAR flips to `platform sdk: 3.2.0  account,iap,notifications`.

### 22.7 Validation matrix

| Validation                                                         | When                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `isPlatformSdkPresent` / `getPlatformSdkVersion` coercions          | Jest (`src/__tests__/platform-sdk-probe.test.ts`, 6 cases)                   |
| `getPlatformSdkProbe` normalizer: empty / partial / extra / null   | Jest (4 cases)                                                               |
| `getPicoRuntimeInfo` Phase J fields present/absent                  | Jest (2 cases)                                                               |
| `Class.forName` actually resolves PICO SDK classes                  | Requires a device / emulator with the real SDK AAR in place (deferred)        |
| DiagnosticsPanel UI renders probe summary correctly                 | Requires example app on a device (deferred)                                   |

## 23. Capability runtime — every prebuild flag gets a runtime API (Phase K)

### 23.1 The gap Phase K closes

Phases A–C declared manifest-level capability flags (`eyeTracking`, `passthrough`, `foveatedRendering`, …). Phase J added the cross-cutting PICO Platform SDK detector. But every capability flag was **declaration only**: flipping `eyeTracking: true` in `app.config.ts` wrote `<uses-feature pico.hardware.eyetracking>` and `<uses-permission com.picovr.permission.EYE_TRACKING>` to the manifest, but no JS code could actually read a gaze pose at runtime.

Phase K closes that gap. Every capability the prebuild plugin declares now has:

1. **A BuildConfig mirror** — JS code can ask "did the prebuild flag this on?" synchronously via `getDeclaredCapabilities()`.
2. **A three-layer snapshot** — `getCapabilitySnapshot()` reports per-capability `declared` × `systemFeatureAvailable` (PackageManager) × `sdkAvailable` (reflection probe) × derived `fullyAvailable`.
3. **A reflection-gated runtime API** — `capabilities.eye.getPose()`, `capabilities.display.setRefreshRate(90)`, `capabilities.controllers.triggerHaptic('left', 0.8, 40)`, etc. Each method returns the real value on a PICO device with the SDK present, and `null` / `false` / `[]` on a mobile emulator or SDK-less PICO build.

### 23.2 Native layout

Kotlin runtime split into one registry + six domain files, each reflection-gated to `PXR_Plugin` / PICO SDK classes via `PicoPlatformSdkDetector`:

```
PicoCapabilityRuntime.kt  — 3-layer snapshot + declared-flag accessors
PicoXrRuntime.kt          — refresh rate, foveation, passthrough
PicoTrackingRuntime.kt    — eye, face, body, hand tracking
PicoSpatialRuntime.kt     — boundary, scene mesh, detected planes
PicoControllerRuntime.kt  — controllers, haptics, Motion Tracker
PicoSensorRuntime.kt      — high-rate IMU sensors (pure AOSP)
PicoSpatialAudioRuntime.kt — HRTF engine
```

All reflection paths swallow `Throwable` defensively (not just `ClassNotFoundException`) to survive `NoClassDefFoundError` / `VerifyError` / missing native `.so` when a partial SDK AAR is on the classpath.

### 23.3 TypeScript surface

A single `capabilities` umbrella export groups every domain:

```ts
import { capabilities } from 'expo-pico-core';

const decl = capabilities.getDeclared();
if (decl.handTracking) {
  const enabled = await capabilities.hand.enable();
  const pose = await capabilities.hand.getPose();
}

const snapshot = await capabilities.getSnapshot();
// [{ name: 'eyeTracking', declared: true, systemFeatureAvailable: false, sdkAvailable: false, fullyAvailable: false }, …]

const rates = await capabilities.display.getSupportedRefreshRates();
await capabilities.display.setRefreshRate(90);
await capabilities.controllers.triggerHaptic('right', 0.8, 50);
```

Per-domain namespaces: `display`, `eye`, `face`, `body`, `hand`, `boundary`, `scene`, `controllers`, `motionTracker`, `sensors`, `spatialAudio`.

### 23.4 BuildConfig fields added

`withPicoGradle.ts` now writes 18 additional fields covering every Phase C/D/I option plus `refreshRates` and `targetDevices` as delimited strings. Fields:

- `PICO_HAND_TRACKING`, `PICO_PASSTHROUGH`, `PICO_SCENE_UNDERSTANDING`
- `PICO_EYE_TRACKING`, `PICO_FACE_TRACKING`, `PICO_BODY_TRACKING`
- `PICO_SPATIAL_AUDIO`, `PICO_FOVEATED_RENDERING`
- `PICO_HIGH_SAMPLING_RATE_SENSORS`, `PICO_BOUNDARY`, `PICO_SCENE_MESH`
- `PICO_SENSE_CONTROLLER`, `PICO_MOTION_TRACKER`, `PICO_CONTROLLER_HAPTICS`
- `PICO_OPENXR_LOADER`, `PICO_NDK_ABI_FILTERS`
- `PICO_DEVELOPER_TOOLS`, `PICO_ENTITLEMENT_CHECK`
- `PICO_REFRESH_RATES` (comma-separated), `PICO_TARGET_DEVICES` (comma-separated)

### 23.5 DiagnosticsPanel integration

The example's Phase F / J DiagnosticsPanel gains a third inline table: **CAPABILITIES (Phase K)**. Each row shows `decl / feat / sdk / ✓` with color-coded cells so a developer can see at a glance which of the three layers is missing for any unavailable capability. Running on a PICO 4 Ultra with the Platform SDK AAR dropped in shows mostly-green rows; running on a mobile emulator shows only the `decl` column lit.

### 23.6 What Phase K does NOT cover

- **Vendor-specific SDK class names.** PICO renames classes across SDK minor versions (`com.picovr.cvinterface.PXR_EyeTracking` → `com.pvr.eyetracking.EyeTrackingApi` in some builds). Every Phase K probe takes a candidate list; when new names ship, add them to the existing list. No caller needs to change.
- **Async event streams.** Eye / face / body tracking poses stream at 60–120 Hz. Phase K exposes synchronous "get the latest pose" APIs; high-frequency subscribers should use the renderer-layer event path (OpenXR action sets + render loop) rather than polling through the JNI bridge.
- **Platform SDK integration for tracking.** Eye / face / body tracking require PICO's NDA-gated enterprise Platform SDK AAR (not redistributable). When the consumer drops the AAR in, Phase K's reflection path picks it up automatically — no code changes needed.

### 23.7 Validation matrix

| Validation                                                         | When                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Declared-capability mirror (empty / filled / missing-field)        | Jest (`src/__tests__/capabilities.test.ts`, 4 cases)                          |
| Snapshot forwards native list + handles null                        | Jest (2 cases)                                                               |
| `isCapabilityAvailable` forwards boolean + null                    | Jest (2 cases)                                                               |
| `capabilities.display.*` forwards refresh rate + foveation + passthrough | Jest (7 cases)                                                           |
| `capabilities.eye/face/body/hand` null-on-SDK-absent                | Jest (5 cases)                                                               |
| `capabilities.boundary/scene` null-on-SDK-absent                   | Jest (4 cases)                                                               |
| `capabilities.controllers` list + haptic + motion tracker          | Jest (3 cases)                                                               |
| `capabilities.sensors` null/empty coercion                          | Jest (2 cases)                                                               |
| `capabilities.spatialAudio` null-on-SDK-absent                      | Jest (3 cases)                                                               |
| `capabilities` umbrella exposes every domain                        | Jest (1 case)                                                                |
| Plugin BuildConfig fields wire for every resolved option            | Jest (`__tests__/withPicoGradle.test.ts`, 4 Phase K cases)                    |
| Reflection actually resolves PICO SDK methods on device             | Requires PICO device with Platform / PXR_Plugin AAR (deferred)                |
