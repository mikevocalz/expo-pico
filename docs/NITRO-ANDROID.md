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
exits 1 on all twelve packages with _"`autolinking.PicoAccount` is not a
valid & safe string"_, which is a misleading message for a shape error.
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

| File                     | Role                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `build.gradle`           | AGP library + Kotlin, CMake external build, Nitro autolinking                            |
| `CMakeLists.txt`         | Declares the `SHARED` library, includes the generated `+autolinking.cmake`               |
| `src/main/cpp/<Lib>.cpp` | Anchor TU so CMake can create the target before the generated sources are appended to it |
| `src/nitro/`             | Hand-written Kotlin HybridObject implementations                                         |
| `src/main/java/`         | The old Expo Modules Kotlin — **on disk, not in the build**                              |

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

That existed so sibling Kotlin could import core's SDK-detection helper
(then `PicoPlatformSdkDetector`, now `PicoDevice.classPresent()`), and it was the one place the build depended on an autolinker
choosing a particular Gradle project name.

**It has been removed.** Under Nitro each package is a self-contained
module with its own uniquely-named JNI library, and nothing references a
sibling by Gradle project name. That makes the naming question moot rather
than answering it — there is no name left to get wrong, no include order to
respect, and no way for one package to be present while a peer it needs is
missing.

## Inclusion: React Native autolinking

Every `@expo-pico/*` package with an Android module ships a
`react-native.config.js` and a `ReactPackage`:

- `@expo-pico/core`: `PicoCorePackage`. It loads every installed Nitro
  library and starts the runtime that `BuildConfig.PICO_XR_MODE` names for
  the flavor being built.
- Every other package: `ExpoPico<Name>Package`, whose companion `init` calls
  that package's generated `ExpoPico<Name>OnLoad.initializeNative()`.

React Native autolinking includes each module as `:expo-pico_<name>`, adds
it to the app's dependencies and puts the package in `PackageList`. This
works without the `@expo-pico/core` config plugin, so a mobile or Quest
build with no PICO app ID still links every module.

Autolinking finds the package class with a regex that cannot read a
constructor with a default-value expression. That is why `PicoCorePackage`
takes its no-argument form as a secondary constructor.

Core's `expo-module.config.json` points Expo autolinking at `android-expo`
only, the PICO OS 5 window listener, linked as `:expo-pico-core-window`.
The sibling packages have no `expo-module.config.json`.

Earlier versions included the modules from the config plugin
(`withPicoNitroModules`) and registered `PicoCorePackage` in
`MainApplication`. Both now remove what they used to write: a leftover
`include ':expo-pico-*'` block would compile each module a second time
next to the autolinked `:expo-pico_*` project, and a leftover
`add(PicoCorePackage(...))` would register the package twice.

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

| Package       | `androidCxxLibName`     | Generated Kotlin package  | HybridObjects             |
| ------------- | ----------------------- | ------------------------- | ------------------------- |
| core          | `ExpoPicoCore`          | `…expopico.picocore`      | `PicoCore`, `PicoRuntime` |
| account       | `ExpoPicoAccount`       | `…expopico.account`       | `PicoAccount`             |
| achievements  | `ExpoPicoAchievements`  | `…expopico.achievements`  | `PicoAchievements`        |
| iap           | `ExpoPicoIap`           | `…expopico.iap`           | `PicoIap`                 |
| leaderboards  | `ExpoPicoLeaderboards`  | `…expopico.leaderboards`  | `PicoLeaderboards`        |
| notifications | `ExpoPicoNotifications` | `…expopico.notifications` | `PicoNotifications`       |
| rooms         | `ExpoPicoRooms`         | `…expopico.rooms`         | `PicoRooms`               |
| rtc           | `ExpoPicoRtc`           | `…expopico.rtc`           | `PicoRtc`                 |
| social        | `ExpoPicoSocial`        | `…expopico.social`        | `PicoSocial`              |
| spatial       | `ExpoPicoSpatial`       | `…expopico.spatial`       | `PicoSpatial`             |
| storage       | `ExpoPicoStorage`       | `…expopico.storage`       | `PicoStorage`             |
| subscription  | `ExpoPicoSubscription`  | `…expopico.subscription`  | `PicoSubscription`        |

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
