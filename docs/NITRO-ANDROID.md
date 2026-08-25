# The Android build under Nitro

State of the migration, what changed, and what is left. Everything below
was verified by running the real tools — `nitrogen@0.37.0`, a Groovy
parser, and Gradle — not inferred from documentation.

## Three things were broken before any of this could build

**1. Every `nitro.json` used an invalid schema.** All thirteen HybridObject
entries were written as:

```json
"autolinking": { "PicoAccount": { "all": { "language": "kotlin", … } } }
```

Nitro's `autolinkingAllImplementationSchema` declares
`language: z.literal('c++')` — `"all"` accepts C++ and nothing else.
Kotlin has to go under `"android"`. Running nitrogen against the old files
exits 1 on all twelve packages with *"`autolinking.PicoAccount` is not a
valid & safe string"*, which is a misleading message for a shape error.
Fixed to:

```json
"autolinking": { "PicoAccount": { "android": { "language": "kotlin", … } } }
```

**2. `expo-pico-core` used a reserved namespace.** Its `cxxNamespace` and
`androidNamespace` were `["expopico", "core"]`, and nitrogen rejects
`core`, `nitro` and `NitroModules` as namespace segments. Renamed to
`["expopico", "picocore"]`, so the generated Kotlin now lands in
`com.margelo.nitro.expopico.picocore`.

**3. Four packages had Kotlin but no `android/build.gradle`** —
achievements, leaderboards, social, storage. Nothing compiled them and
nothing linked them. They now have one, like the other eight.

With those three fixed, `nitrogen` generates cleanly for all twelve
packages: 13 HybridObjects, ~180 members.

## What each package's `android/` now contains

| File | Role |
| --- | --- |
| `build.gradle` | AGP library + Kotlin, CMake external build, Nitro autolinking |
| `CMakeLists.txt` | Declares the `SHARED` library, includes the generated `+autolinking.cmake` |
| `src/main/cpp/<Lib>.cpp` | Anchor TU so CMake can create the target before the generated sources are appended to it |
| `src/nitro/` | Hand-written Kotlin HybridObject implementations |
| `src/main/java/` | The old Expo Modules Kotlin — **on disk, not in the build** |

`expo-module-gradle-plugin` is gone from all twelve.

### The source set is an assignment, not an append

```gradle
sourceSets {
    main {
        java.srcDirs = ["src/nitro"]
    }
}
```

`=` rather than `+=` drops AGP's default `src/main/java`. That directory
still holds 62 Kotlin files extending
`expo.modules.kotlin.modules.Module`, which no longer resolves — with
`expo-module-gradle-plugin` removed, `expo-modules-core` is not on the
classpath. Compiling them would fail. They stay on disk as the reference
for porting each method into `src/nitro`, and each one leaves the tree when
its Nitro equivalent lands.

The nitrogen script applied at the bottom of `build.gradle` appends
`../nitrogen/generated/android/kotlin` to that same source set, so the
final set is `["src/nitro", <generated>]`.

## The cross-package Gradle dependency is gone

Every sibling used to carry:

```gradle
// Resolved via Expo Modules autolinking, which generates an
// `include :expo-pico-core` line in the consuming app's settings.gradle.
implementation project(':expo-pico-core')
```

That existed so sibling Kotlin could import `PicoPlatformSdkDetector` from
core, and it was the one place the build depended on an autolinker
choosing a particular Gradle project name.

**It has been removed.** Under Nitro each package is a self-contained
module with its own uniquely-named JNI library, and nothing references a
sibling by Gradle project name. That makes the naming question moot rather
than answering it — there is no name left to get wrong, no include order to
respect, and no way for one package to be present while a peer it needs is
missing.

## Inclusion is now explicit

Expo Modules autolinking used to include these projects because each
shipped an `expo-module.config.json` listing Android modules. That config
is now `{"platforms": []}`, which makes `findModules` skip the package
entirely — verified against `supportsPlatform` in
`expo-modules-autolinking@3.0.0`.

That mattered for more than the module list. Expo's `findAndroidPackagesAsync`
globs `**/*Package.{java,kt}` across the module's `android/` directory and
adds whatever it finds to the app's generated package list. `PicoCorePackage.kt`
is still on disk, so leaving the config in place would have put a reference
to an uncompiled class into the app and broken the build.

Nitro has no autolinker that writes `settings.gradle` — it only generates
the per-module Gradle and CMake fragments a project applies *once it is
included*. So `withPicoNitroModules` does the inclusion:

- Resolves each `@expo-pico/*` package from the app root, so hoisting,
  pnpm and workspace links all work.
- Skips any package without an `android/build.gradle`.
- Names projects with the exact algorithm
  `expo-modules-autolinking` uses (`convertPackageToProjectName`: strip a
  leading `@`, collapse `\W+` to `-`). A test asserts the two agree for
  every package in the family.
- Writes nothing for a project that is already included, under any of the
  `include ':x'` / `include(":x")` / `include ':x', ':y'` spellings.

Matching Expo's naming is the point, not a coincidence: if that autolinker
is ever active alongside this plugin, the existence check sees its line and
this block stays empty. Diverging would include the same directory twice
under two names and compile the module twice into one APK.

## The `expo-module.config.json` files should be deleted

They are neutralised, not removed — this session could write files to the
repo but not delete them. Once you are satisfied the build links correctly:

```bash
git rm packages/expo-pico-*/expo-module.config.json
```

`app.plugin.js` at each package root is what resolves the config plugin, so
removing these does not affect plugin discovery. `expo-pico-social`'s file
also carried a `plugin` field; that has been preserved in the neutralised
version, and `app.plugin.js` covers it either way.

There is also a leftover probe file to delete:

```bash
rm packages/expo-pico-account/android/src/nitro/.pico-depth-probe
```

## Generated output is not committed

`nitrogen/generated/` is produced by `yarn nitrogen` (already wired as a
script in every package, and part of `build` and `prepare`). Gradle fails
fast if the generated `+autolinking.gradle` is missing rather than silently
building a module with no bindings, so run it before syncing.

`nitrogen/generated` is already listed in each package's `files` array, so
published tarballs carry the bindings and consumers never run nitrogen.

## Per-package identifiers

| Package | `androidCxxLibName` | Generated Kotlin package | HybridObjects |
| --- | --- | --- | --- |
| core | `ExpoPicoCore` | `…expopico.picocore` | `PicoCore`, `PicoRuntime` |
| account | `ExpoPicoAccount` | `…expopico.account` | `PicoAccount` |
| achievements | `ExpoPicoAchievements` | `…expopico.achievements` | `PicoAchievements` |
| iap | `ExpoPicoIap` | `…expopico.iap` | `PicoIap` |
| leaderboards | `ExpoPicoLeaderboards` | `…expopico.leaderboards` | `PicoLeaderboards` |
| notifications | `ExpoPicoNotifications` | `…expopico.notifications` | `PicoNotifications` |
| rooms | `ExpoPicoRooms` | `…expopico.rooms` | `PicoRooms` |
| rtc | `ExpoPicoRtc` | `…expopico.rtc` | `PicoRtc` |
| social | `ExpoPicoSocial` | `…expopico.social` | `PicoSocial` |
| spatial | `ExpoPicoSpatial` | `…expopico.spatial` | `PicoSpatial` |
| storage | `ExpoPicoStorage` | `…expopico.storage` | `PicoStorage` |
| subscription | `ExpoPicoSubscription` | `…expopico.subscription` | `PicoSubscription` |

Generated Kotlin packages are prefixed `com.margelo.nitro.`. The library
names are distinct, so several `@expo-pico/*` packages in one APK produce
several differently-named `.so` files and never collide — see
[PPS-ARTIFACTS.md](./PPS-ARTIFACTS.md) for the same argument at the Maven
layer.

## What is left

**The Kotlin.** Thirteen `Hybrid*.kt` classes under `src/nitro`, one per
HybridObject, extending the generated `Hybrid*Spec` abstract classes. The
generated specs define the exact contract — 180 members across the family —
and [PPS-API-SURFACE.md](./PPS-API-SURFACE.md) has the real
`javap` signatures for the PPS calls they need to make.

Until those land, the modules build and link but no HybridObject resolves,
so the TypeScript façades report the service as unavailable — which is the
same path they already take on the `mobile` flavor and on non-PICO
hardware.

## Verification performed

- `nitrogen@0.37.0` run against all twelve packages: 12/12 generate,
  13/13 HybridObjects.
- All twelve `build.gradle` files parsed with `groovy.lang.GroovyShell`:
  0 failures.
- Generated `+autolinking.gradle` filenames cross-checked against the
  `apply from:` line in each `build.gradle`: 12/12 match.
- 38 Jest tests over the artifact and inclusion logic.

Not yet done, and it needs a machine with the Android SDK and NDK: an
actual `assemblePicoDebug`. Nothing here has been compiled.
