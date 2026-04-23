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

### How the design supports SDK 55 now and SDK 56+/RN 0.84.1+ later

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
- Forward compatibility to RN 0.84.1 is **through Expo SDK 56+**, not directly under SDK 55. We do not claim SDK 55 supports RN 0.84.1 — that would be a false version pairing.
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
