# Expo PICO: Eskiu runtime

## Target architecture

TypeScript/React Native -> Nitro Modules V1 HybridObjects (Kotlin) -> either PICO Java/Kotlin SDKs
or the Eskiu C ABI. ViroCore consumes the same Eskiu C ABI directly for hot XR paths.

An earlier plan replaced Nitro with Expo Modules v2. The project kept Nitro instead and moved every
package to Nitro V1; the Eskiu pieces below are unchanged by that decision.

### Move to Eskiu

- capability bitsets and runtime state snapshots
- pose/quaternion/vector transforms
- eye/face/body/hand frame normalization
- scene mesh filtering/index transforms and plane processing
- passthrough/foveation/refresh-rate state calculations
- haptic parameter normalization
- fixed-layout packets shared with ViroCore

### Keep in Kotlin

PICO Platform Service SDKs are AAR/Java APIs. Account, IAP, achievements, leaderboards, rooms,
social, storage, subscription, notifications and RTC call them from their Nitro HybridObjects.

### Android linking

Eskiu 0.9.3 emits native object files, supports AArch64 and uses the platform C ABI. Its roadmap
still lists per-target Android native-library linking as unfinished. Expo PICO therefore uses
`eskiuc` as the object compiler and lets CMake/NDK clang link the final shared library.

## Status

- Eskiu doctor, the arm64 object helper and the C ABI are in place.
- Core links the Eskiu runtime into `libExpoPicoCore.so` next to its Nitro sources and exposes
  icon meshes through `PicoRuntime.getIconMesh`.
- `yarn audit:native-bridge:strict` fails on any native bridge that is not Nitro V1.

## Guardrails

- Preserve the public TypeScript API while internals move.
- Never redistribute PICO SDK AARs.
- Non-PICO/mobile builds do not require Eskiu.
- PICO production is arm64-first.
- Require size and native-heap comparisons before removing the old path for each slice.
