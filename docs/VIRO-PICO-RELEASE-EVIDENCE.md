# Viro + PICO release evidence

This is the evidence ledger for the three-repository PICO release. It records what was actually
run, on which revisions, with which tools. The three pull requests (ViroCore, Viro, Expo-PICO) all
link here.

Status vocabulary is exactly **PASS**, **BLOCKED**, **FAIL**. Nothing else. BLOCKED means the check
could not run and says why; FAIL means it ran and did not hold.

## Branch heads under test

| Repository | Head |
| --- | --- |
| virocore | `8a05e2c1` |
| viro | `8c17158` |
| expo-pico | `a3500263` |

## Gate summary

| Gate | Scope | Status |
| --- | --- | --- |
| G0 | Custom-binary inventory across both forks | PASS |
| G1 | Android AAR provenance and 16KB page alignment | PASS |
| G1.3 / G1.4 | `npm pack` tarball and APK build | PASS |
| G2 | iOS deployment-target invariant | PASS |
| G3 | ViroKit rebuild, device / simulator link | PASS (device) / FAIL (simulator) |
| G4 | Test suites, native and web | PASS (native) / BLOCKED (web) |
| G5 | On-device PICO validation | BLOCKED |
| G6 | Documentation and design skills | PASS (items 1, 2, 3, 4, 7, 8) / BLOCKED (items 5, 6) |
| WASM lane | Web renderer build | BLOCKED |

## Tool versions

| Tool | Version |
| --- | --- |
| Xcode | 26.4.1 (17E202) |
| iOS SDK | 26.4 |
| visionOS SDK | 26.4 |
| Android NDK | 27.1.12297006 |
| JDK | 17.0.20.1 |
| node | 26.8.2 |
| yarn | 1.22.22 |
| CocoaPods | 1.17.0 |
| cmake | 4.4.3 |
| emcc | not installed |

`emcc` is absent from this machine, so the WASM lane is **BLOCKED**. No Emscripten output was
produced or inspected.

## Upstream pins and drift

Every pin was re-resolved against the upstream repositories at the time of this ledger. All five
pull requests are **OPEN**.

| Upstream PR | Re-resolved head | State | Fork agreement |
| --- | --- | --- | --- |
| viro#526 | `5bddce6` | OPEN | drifted (see below) |
| viro#527 | `bc51be9` | OPEN | byte-for-byte on non-binary files |
| viro#528 | `e7ea9b1` | OPEN | byte-for-byte on non-binary files |
| virocore#376 | `222b369` | OPEN | byte-for-byte on non-binary files |
| virocore#377 | `1a3c43f` | OPEN | byte-for-byte on non-binary files |

Neither fork records the SHA it integrated for any of the five. Every integration point below was
inferred by comparing file content, not read from a recorded pin. Treat the four "byte-for-byte"
rows as strong evidence of agreement, not as a recorded provenance chain.

### viro#526 drift

The fork integrated `b893648`. The current head of that pull request is the merge commit
`5bddce6`, committed 26 minutes after the fork's integration commit. That merge reverts the Quest
scene root back to `ViroScene` and states in its own message that the revert costs all detected
surfaces. Taking `5bddce6` as-is would therefore undo the scene-root work this release depends on.
No action taken; the fork stays on the `b893648` content and this row is the reason.

## Provenance records

### G0 custom-binary set

**PASS.** Every binary under `ios/Libraries/**` and `jniLibs/**` in virocore is byte-identical to
`origin/develop`. virocore ships zero custom binaries.

viro carries four custom binaries. Each has a locatable producing source, so there is no
`CUSTOM-NO-SOURCE` entry in the inventory.

| Binary | Producing source located |
| --- | --- |
| `ViroKit.framework/ViroKit` | yes |
| `lib/libViroReact.a` | yes |
| `react_viro-release.aar` | yes |
| `viro_renderer-release.aar` | yes |

### G1 Android AAR provenance

**PASS.**

| Artifact | sha256 |
| --- | --- |
| `viro_renderer-release.aar` | `dc9a68a086947c59d3917b535713a99c9563b719fb328861c1287e9b554219d4` |
| `react_viro-release.aar` | `6907dc2eac2120629cf5fa19b155a295a8cebc7304720254347b966da1ad81f8` |
| `libviro_renderer.so` (inside the renderer AAR) | `2a5c022176e06251a200e7e76cbf2e7f1f4a0b3576d783f159ebca427ba3a997` |

`viro_renderer-release.aar` was built from virocore `6541ac3c` via `scripts/build-pico-aar.sh`,
NDK 27.1.12297006, with `-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON`. The alignment sweep reports
14 of 14 `arm64-v8a` libraries at 16KB, 0 failures.

### G3 iOS framework provenance

`ViroKit.framework/ViroKit`, rebuilt at deployment target 15.1 and staged into viro:
sha256 `d3c64671728524569124d7f2146e3bda78c85c859419fd6db6a886f0444262ad`.

Device build: **PASS**. Every row of the deployment-target invariant now holds, with the worst
input being `libreactvisioncca` at 13.0, below the 15.1 consumers declare.

Simulator build: **FAIL**, at link. Detail and the reason it cannot be closed here are in
[Open risks](#open-risks), item 1.

## G2 iOS deployment target, before and after

The invariant is that the shipped framework's `LC_BUILD_VERSION minos` must not exceed the
deployment target its consumers declare. The shipped ViroKit violated it: `minos 17.6` against
podspecs claiming 13.0 and apps declaring 15.1.

The 17.6 value is incidental, not required. Upstream `ab1fbe9` ("fix building issues") bumped the
target from 9.1 to 17.6, while the only real fix in that commit is two `#include <vector>` lines.
No availability-annotated symbol forces 17.6.

F = 15.1, taken from React Native 0.86.0 `helpers.rb:84`.

A trial build at the proposed target compiled 275 translation units at
`-target arm64-apple-ios15.1` with zero availability diagnostics, on device and simulator both.
The project emits `-Wno-unguarded-availability`, which is clang's parent group for the diagnostics
in question, so the absence of warnings could have been an artifact of flag ordering. That was not
assumed: a control translation unit referencing an iOS-16 symbol was compiled under the same flags
and did produce the diagnostic, which confirms the ordering leaves the check live.

Converged in virocore `d467a13a`.

| Setting | Before | After | Changed |
| --- | --- | --- | --- |
| `project.pbxproj` iOS deployment target (4 occurrences) | 17.6 | 15.1 | yes |
| ViroKit iOS podspec #1 | 13.0 | 15.1 | yes |
| ViroKit iOS podspec #2 | 13.0 | 15.1 | yes |
| XROS deployment target (4 occurrences) | 1.0 | 1.0 | no, deliberate |
| Project-level deployment target (2 occurrences) | 10.0 | 10.0 | no, deliberate |
| `ViroReact.podspec` | 15.1 | 15.1 | no, already correct |
| Podfile platform | 15.0 | 15.0 | no, deliberate |

## Symbol chains

One build of `libviro_renderer.so` (sha256 above) was traced end to end:

1. The shared object exports `Java_com_viro_core_Renderer_nativeGetPlaneDetectionStatus`.
2. `javap` on the classes packaged alongside it shows `Renderer.getPlaneDetectionStatus()`.
3. `javap` also shows `ViroViewOpenXR.getPlaneDetectionStatus()`.

Both Java methods are `public int`. The chain was established for a single build; it is not a
per-release automated check.

## APK checks

Both gates now pass. A PICO APK exists and is traceable to the sources that produced it.

### Packaging (G1.3)

`npm pack` was blocked by an exit code, not by missing output. `tsc` writes complete JS and `.d.ts`
for every file — the project does not set `noEmitOnError` — so the only consequence of its 48 errors
was that `prepare` short-circuited `tsc && copy-files` before `copy-files` ran, which meant
`dist/components/Resources` had been shipping whatever was last committed rather than the current
copy.

`build` now runs `scripts/typecheck-gate.js` (viro `0eb5235`). It keeps the emit and permits exactly
two diagnostic shapes: one naming an absent module, and `TS7006` in a file that reaches an absent
module through the repo's own relative imports. That reachable set is computed from the import graph
rather than listed, so a new file inherits the right treatment without editing the gate. Everything
else fails, as does output that is not a parseable file diagnostic — a `tsc` crash or a config error
is never waved through.

Three controls establish that it is not a rubber stamp:

| Control | Expected | Result |
| --- | --- | --- |
| `TS2322` in a file that reaches no absent module | reject | exit 1 |
| `TS7006` in that same file | reject | exit 1 |
| Clean tree | accept | exit 0, all 48 attributed |

The second control is the load-bearing one: it proves the implicit-any clause is scoped to tainted
files rather than blanket.

| Artifact | Value |
| --- | --- |
| Tarball | `reactvision-react-viro-3.0.0-moyo.3.tgz` |
| SHA-256 | `dcc1e49c01eb26860b173ac0336ba8e176251b2eedc68d63841811c8ce66e4fe` |
| Package name | `@reactvision/react-viro` |
| Files | 1687 |
| Renderer AAR inside | `dc9a68a0…4219d4`, exact match |
| Bridge AAR inside | `6907dc2e…d81f8`, exact match |
| ViroKit inside | `minos 15.1` |
| `dist` navigator | carries `hdrEnabled={!ViroPlatform_1.isQuest}` |
| `dist/components/Resources` | present |

### APK (G1.4)

Built from the paired fork build with `openXrLoaderOverlay: false` and `viroRendererOverlay: false`,
so a staged older `.so` could not mask the new one.

| Check | Result |
| --- | --- |
| APK | `app-pico-debug.apk`, 175 MB |
| SHA-256 | `0dd44afdbc3906c0a54092a5d0d19d921f4ed2ec91c40968ba63504e8552b9f8` |
| `libviro_renderer.so` in APK | `2a5c0221…a997` — identical to the copy inside the step-1 AAR |
| JNI symbol | `Java_com_viro_core_Renderer_nativeGetPlaneDetectionStatus` exported |
| `libopenxr_loader.so` | `50d69917…da1e` |
| `zipalign -v -c -P 16 4` | Verification successful |
| ELF 16KB alignment | 48 of 50 libraries OK, 2 failures |

ELF and ZIP alignment are separate facts and both were checked. The two ELF failures are
`lib/arm64-v8a/libpxrplatformloader.so` and `lib/arm64-v8a/libpxrplatformloader4j.so`, each reporting
`PT_LOAD alignment 0x1000 < 0x4000`. Both arrive from PICO's own Platform Service SDK through the
Bytedance Maven artifact. Every Viro and fork library in the APK is clean at `0x4000`. See open
risks.

### Blockers found and cleared on the way here

Each of these would have consumed a device session before anyone reached a real test case.

**1. `MainApplication.kt:38` — `Unresolved reference 'PICO'`.** `expo install expo-gl` ran yarn as a
side effect, which reverted `@reactvision/react-viro` to published `2.58.1`. That version's
`ReactViroPackage.ViroPlatform` enum has no `PICO` constant; the fork's bridge AAR does. This is the
G5 PRE-2 precondition surfacing as a hard compile error rather than an ambiguous runtime `null`.

**2. `nitro-canvas-in-Vision` breaks Metro for every consuming app.** It is 404 on npm, declared in
no dependency section, and eagerly required from the package entry through `ViroGpuPanel`,
`ViroThreeJSPanel` and `ViroRivePanel`. Any app importing anything at all from
`@reactvision/react-viro` fails to bundle. It exists only as a local checkout. This remains an open
blocker for publishing.

**3. `expo-gl`, pulled transitively.** `nitro-canvas-in-Vision` sets `"react-native": "src/index"`,
so Metro resolves its `src/` while `tsc` and Node use the built `lib/`. `expo-gl` therefore never
appeared in any typecheck — `tsc` stops at the first unresolvable module and does not follow into
its imports. Only a bundler walks that far.

**4. `expo prebuild` aborted outright** (expo-pico `84ff76d`). Four packages — achievements,
leaderboards, social, storage — had `app.plugin.js` requiring `./plugin/build/index` while `tsc`
emits `plugin/build/src/index.js`; the other eleven spell the `src/` segment out. It stayed hidden
because the path resolves only when Expo loads the plugin during prebuild, and the build outputs are
gitignored, so a fresh checkout fails earlier for an unrelated reason.

### G5 PRE-1 cleared

expo-pico `2063e9c`. `example/index.js` no longer overrides Viro's `VRQuestScene` registration. That
override was a workaround for published `2.58.1` gating the navigator's intent path on `isQuest` —
and its `ViroPlatform` contains no `isPico` at all, zero occurrences — so on PICO nothing ever set
the intent and VRActivity mounted with nothing to read. The fork gates on `isQuest || isPico`, which
makes the workaround obsolete and actively harmful: keeping it removed `ViroQuestEntryPoint`, and
with it scene push/pop, `onExitViro`, and the view tag that `getCapabilities` resolves against. The
`xr` route now mounts `ViroXRSceneNavigator` through `XrLauncher`.

## Device matrix

**BLOCKED.** No device serial was available, so no row in this matrix was executed. The procedure
is written up in `docs/pico/g5-runbook.md` in the viro repository.

| Check | Status | Reason |
| --- | --- | --- |
| Plane detection transitions `null` -> `true` | BLOCKED | no device; predicted UNREACHABLE on PICO regardless |
| `getCapabilities` returns an initialized capability set | BLOCKED | no device; rejects `E_XR_REBUILD_REQUIRED` against the pinned package |
| HDR composite versus passthrough on PICO (runbook case K07) | BLOCKED | no device |

Two preconditions would still block G5 even with a serial in hand:

1. The example app overrides the `VRQuestScene` registration. The override drops
   `ViroQuestEntryPoint`, the push/pop handling, `onExitViro`, and the viewTag, so the scene the
   runbook describes is not the scene the example mounts.
2. The example pins the published `2.58.1` package. Against that build, `getCapabilities` rejects
   with `E_XR_REBUILD_REQUIRED`, and the rejection is swallowed into a `null` that is
   indistinguishable from "not detected yet". A run against this pin cannot produce a readable
   result even if it completes.

## Test suites

**Native PASS. Web BLOCKED.**

| Project | Suites | Tests | Status |
| --- | --- | --- | --- |
| native | 26 | 226 | PASS |
| web | 5 of 9 `web*` suites blocked, 4 pass | | BLOCKED |

The web blockage was measured, not inferred: each of the 5 suites was run and the failure traced to
the missing renderer package.

Jest is now split into `native` and `web` projects. The web project fails fast from `globalSetup`
with a single line naming the missing path and viro#527, and honours `WEB_RENDERER_DIR` so a local
checkout of the renderer unblocks it. Nothing was mocked, aliased, skipped, or deleted to reach
this state.

`tsc` delta across the release: 0.

## Skill outputs

**G6 PASS** for items 1, 2, 3, 4, 7 and 8, plus the Mobbin reference pull. The resulting
documentation is committed in virocore `8a05e2c1` and viro `8c17158`.

Items 5 (accessibility) and 6 (design critique) are **BLOCKED**. Both need G5 device captures as
input, and G5 did not run.

## Fixes landed

Each fix below has its verification recorded next to it.

### B1: Gradle flavor fallback on `defaultConfig`

`matchingFallbacks` was set on `defaultConfig`, where it does nothing; replaced with
`missingDimensionStrategy`.

Verified by running `javap` across 12 AGP 8.x versions and counting the declared
`matchingFallbacks` members: `DefaultConfig=0`, `BaseFlavor=0`, `ProductFlavor=3`. The property
exists only on `ProductFlavor`, so the original call was inert on every AGP version checked.

Landed in expo-pico `a3500263`.

### B2 / M1: renderer handle race

The native renderer handle could be read after teardown. The handle is now `volatile` and zeroed
before destroy, 20 unchecked JNI dereferences were guarded plus 6 more in `ARCore_JNI`, and a
distinct torn-down sentinel now maps to a terminal JS value instead of an ambiguous zero.

Verified by a 305 of 305 translation-unit sweep, run with a `static_assert(false)` negative control
to prove the sweep actually compiles what it claims. `javac` over 135 sources: 0 errors.

Landed in virocore `da84d316`.

### M3: duplicate-ZIP verification bypass

The artifact verifier iterated `namelist()` and then read by name, so in an archive with duplicate
members the last member won. A stale `.so` could pass verification while a different `.so` was the
one actually loaded. Fixed in both repositories and red-green tested. The alignment suite count
goes 6 -> 7.

### `ViroARPlaneSelector.tsx:299` TS2345

Fixed; `tsc` error count 49 -> 48. Landed in viro `ff3cc1b`.

### Stale `dist` artifact

A committed `dist` artifact shipped an unconditional `hdrEnabled`, overriding the source. Landed in
viro `3c821df`.

### `hdrEnabled={!isQuest}`

The HDR composite occludes passthrough on Quest, per `docs/QUEST_SETUP.md:381` and the platform
matrix; 8 showcase examples already set it this way. PICO is deliberately left on, pending runbook
case K07, which needs hardware. Landed in viro `f0a51bd`.

## Open risks

1. **The iOS simulator slice cannot be produced at all while GVRAudioSDK is a dependency.** G3
   fails at link for the simulator. `ld` reports
   `building for 'iOS-simulator', but linking in object file (Pods/GVRAudioSDK/Libraries/libGVRAudioSDK.a[arm64]) built for 'iOS'`.
   That archive's arm64 slice carries `LC_VERSION_MIN_IPHONEOS 7.0`, which is device iOS, and that
   is the hard error. `ios/Podfile:10` pins `pod 'GVRAudioSDK', '1.140.0'` unconditionally, with no
   simulator/device split. CocoaPods trunk lists three versions ever published (1.100.0, 1.120.0,
   1.140.0) and 1.140.0 is the last; Google archived the Google VR SDK in 2019, so no release with
   an arm64-simulator slice exists or is coming. The dependency is not optional:
   `GVRAudioEngine` / `gvr_audio` symbols are referenced by 8 source files
   (`ViroRenderer/VROSoundGVR.{cpp,h}`, `ViroRenderer/VROPlatformUtil.{cpp,h}`,
   `ios/ViroKit/VRODriverOpenGLiOS.{cpp,h}`, `ios/ViroKit/VROViewScene.mm`,
   `ios/ViroKit/VROViewAR.mm`), and spatial audio goes with it.

   An `.xcframework` is necessary but not sufficient. `lipo` cannot hold device-arm64 and
   simulator-arm64 in one fat file, verified by the tool's own "have the same architectures"
   rejection, which is a second and independent constraint on top of the missing slice. Closing
   the gap requires replacing or conditionally excluding the audio dependency, which is a
   support-matrix decision and sits outside this work's non-goals.

   Three vendored archives also have no arm64-simulator slice: `bullet/x86_64/libLinearMath.a`,
   `protobuf/x86_64`, `harfbuzz/x86_64`. They are the next walls after GVRAudioSDK, not the first
   one. Rebuilding them first will not make the simulator link. All four are architecture coverage,
   not deployment target: each would satisfy the minos ordering if it linked at all.
2. **`libViroReact.a` was not rebuilt.** It remains at its previously committed content while
   `ViroKit` was rebuilt at 15.1.
3. **visionOS has no committed binary** on either ref, and its podspec vendors an `.xcframework`
   that does not exist. Any visionOS consumer fails at integration.
4. **`ViroKit.framework` metadata forks mid-framework.** `Info.plist` and `Shaders.dat` come from
   viro#528 while the binary comes from the local rebuild.
5. **The provenance sidecar is write-only.** `viro_renderer-release.json` is written by the build
   script and nothing reads or verifies it.
6. **`build-pico-aar.sh` marks clean builds dirty.** It derives its `dirty` flag from
   `git status --porcelain`, which counts untracked files. Running the gate's own mandated test
   first generates `scripts/__pycache__/`, so following the documented order stamps every artifact
   as dirty.

The CCA precondition for virocore#377 is met: all four `libreactvisioncca` archives are
byte-identical to develop, so that pull request's refresh is takeable without losing local work.

7. **`nitro-canvas-in-Vision` makes the package unpublishable as it stands.** It is 404 on npm,
   declared in no dependency section, and eagerly required from the package entry through
   `ViroGpuPanel`, `ViroThreeJSPanel` and `ViroRivePanel`. Metro cannot resolve it, so any app
   importing anything from `@reactvision/react-viro` fails to bundle — the APK above only builds
   because a local checkout was copied into `node_modules`. It also pulls `expo-gl` transitively via
   its `"react-native": "src/index"` field, so a consumer inherits that too without it appearing in
   any manifest. Declaring it (optional peer plus local dev dependency, matching how
   `viro-web-renderer` is already declared) and making the entry tolerate its absence are both
   open decisions.
8. **Two PICO Platform Service libraries are 4KB-aligned.** `lib/arm64-v8a/libpxrplatformloader.so`
   and `libpxrplatformloader4j.so` report `PT_LOAD alignment 0x1000 < 0x4000` inside the built APK.
   They come from PICO's own Platform Service SDK through the Bytedance Maven artifact, not from
   Viro or this fork, and nothing in this repo produces them. On a genuine 16KB-page device they
   would fail to load. No runbook case touches the PPS surface, so this does not block the device
   matrix, but it is a real ceiling on that surface and the fix is upstream at PICO.


## Merge order

ViroCore, then Viro, then Expo-PICO. Viro stages binaries produced from ViroCore, and Expo-PICO
consumes Viro's package, so merging out of order publishes a package pointing at binaries that do
not exist yet.

## Waivers

None. No gate in this ledger was passed by exception.
