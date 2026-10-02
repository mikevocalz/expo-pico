# @expo-pico/eskiu-runtime

Internal systems-runtime source for the PICO arm64 path.

- Eskiu: allocation-free math, capability masks, pose/scene transforms, compact runtime state, and data-oriented helpers consumed by ViroCore over the C ABI.
- Expo Modules v2 / Kotlin: React Native registration, events/promises, Activity/Context access, and PICO Platform Service AAR calls.
- ViroCore: renderer/session ownership and direct consumption of the Eskiu C ABI.

PICO's Java/Kotlin SDK calls intentionally stay out of Eskiu; routing them through extra JNI hops would make the stack heavier, not lighter.

Run `yarn eskiu:doctor` before a PICO native build.
