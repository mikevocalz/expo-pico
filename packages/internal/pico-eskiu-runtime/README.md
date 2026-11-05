# @expo-pico/eskiu-runtime

Internal systems-runtime source for the PICO arm64 path.

- Eskiu: allocation-free math, capability masks, pose/scene transforms, compact runtime state, and data-oriented helpers consumed by ViroCore over the C ABI.
- Eskiu icon mesher (`src/icon/`): SVG path parsing, curve and arc flattening, and a round-join/round-cap stroker that turns Lucide icons into triangle meshes for the immersive scene. ABI in `include/expo_pico_eskiu.h`; details in `docs/migration/viro-eskiu-abi.md`.
- Expo Modules v2 / Kotlin: React Native registration, events/promises, Activity/Context access, and PICO Platform Service AAR calls.
- ViroCore: renderer/session ownership and direct consumption of the Eskiu C ABI.

PICO's Java/Kotlin SDK calls intentionally stay out of Eskiu; routing them through extra JNI hops would make the stack heavier, not lighter.

Requires eskiuc at exactly the version in `cmake/eskiu-version.txt`. Install that checksum-verified release with `scripts/install-eskiuc.sh` (no sudo; it goes to `~/.local/eskiu-<version>`), then run `yarn eskiu:doctor` before a native build. `ExpoPicoEskiu.cmake` looks in the directory of `$ESKIUC`, then `~/.local/eskiu-<version>/bin`, then `PATH`, and stops the arm64 configure with an error when it finds no eskiuc at that version, so a stale compiler on `PATH` cannot build the runtime.

`yarn test:eskiu` compiles `src/runtime.esk` for the host and for `aarch64-linux-android`, runs `test/icon_test.c`, and writes PNGs of the curated Lucide meshes.
