# Expo PICO: Eskiu + Expo Modules v2 migration

## Target architecture

TypeScript/React Native -> thin Expo Modules v2 Kotlin adapters -> either PICO Java/Kotlin SDKs
or the Eskiu C ABI. ViroCore consumes the same Eskiu C ABI directly for hot XR paths.

### Move to Eskiu

- capability bitsets and runtime state snapshots
- pose/quaternion/vector transforms
- eye/face/body/hand frame normalization
- scene mesh filtering/index transforms and plane processing
- passthrough/foveation/refresh-rate state calculations
- haptic parameter normalization
- fixed-layout packets shared with ViroCore

### Keep in Expo Modules v2 / Kotlin

PICO Platform Service SDKs are AAR/Java APIs. Account, IAP, achievements, leaderboards, rooms,
social, storage, subscription, notifications and RTC registration should become thin Expo Modules
v2 wrappers instead of keeping Nitro just to call Java APIs.

### Android linking

Eskiu 0.9.2 emits native object files, supports AArch64 and uses the platform C ABI. Its roadmap
still lists per-target Android native-library linking as unfinished. Expo PICO therefore uses
`eskiuc` as the object compiler and lets CMake/NDK clang link the final shared library.

## Migration slices

1. Foundation: Expo SDK 58, Expo Modules v2 baseline, Eskiu doctor, arm64 object helper, C ABI.
2. Core + spatial: replace PicoCore/PicoRuntime Nitro objects; move hot state/math/scene transforms
   to Eskiu; expose ViroCore ABI.
3. Platform services: account/IAP/achievements/leaderboards/rooms/social/storage/subscription/
   notifications to Expo Modules v2; delete their Nitrogen specs.
4. RTC: keep Fishjam/WebRTC lifecycle; Expo Modules v2 owns RN API; Eskiu only for measurable
   reusable packet/state transforms.
5. Nitro removal: remove react-native-nitro-modules/nitrogen, `*.nitro.ts`, `nitro.json`, generated
   Nitro build glue and Jest stubs; audit npm package and APK sizes.

## Guardrails

- Preserve the public TypeScript API while internals move.
- Never redistribute PICO SDK AARs.
- Non-PICO/mobile builds do not require Eskiu.
- PICO production is arm64-first.
- Require size and native-heap comparisons before removing the old path for each slice.
