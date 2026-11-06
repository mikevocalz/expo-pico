# Native SDK dependencies

**Normal app builds do not require placing AAR files in this directory.**
Install the [GitHub release packages](../../docs/INSTALL-FROM-GITHUB.md), keep
your lockfile, and use Expo prebuild followed by the Android Gradle build.

## Dependencies resolved automatically

| Dependency | How it reaches the app |
| --- | --- |
| Core Nitro bindings and Eskiu runtime | Included in the `@expo-pico/core` release package. The release producer builds the runtime; consuming apps do not need the Eskiu compiler. |
| PICO Platform Services (PPS) | The core plugin selects Maven dependencies for installed service packages and registers PICO's public repository. Gradle resolves them during the Android build. |
| PICO Spatial SDK 6 WindowContainer support | Opt in with `enableSpatialSdk: true` on the `@expo-pico/spatial` plugin. The plugin adds the public Maven SDK dependencies for PICO builds. A compatible OS 6 device is also required. |
| An immersive renderer, such as Viro | Install a renderer release containing its matching native artifacts. Those libraries are separate from the Platform Services SDK. |

PICO's Maven repository is
[https://artifact.bytedance.com/repository/Volcengine/](https://artifact.bytedance.com/repository/Volcengine/).
Prebuild generates the Gradle configuration. The Android build resolves the
libraries and reuses the Gradle cache on later builds. A clean prebuild does
not require downloading or rebuilding AARs manually.

## Missing implementation is different from a missing dependency

The current native bridge does not implement core XR passthrough, haptics or
tracking controls, or spatial anchors, live space transitions and scene mesh
retrieval. These methods report unavailable capabilities or reject with
`NOT_IMPLEMENTED`. Adding a legacy SDK archive does not implement them.
Capability declarations in `app.config.ts` do not implement them either.

Spatial SDK 6 WindowContainer open/close has an implemented bridge. Use
`getLayoutBridgeStatus()` to distinguish an unlinked SDK from an unsupported
device. `getSpatialSdkProbe()` only reports class presence; it is not proof
that every API is implemented.

Any legacy local AAR lookup retained in development Gradle files is an
extension point for custom native integrations, not a required install step.
A custom integration needs its own native implementation and dependency
configuration. This project does not provide an automatic download or
redistribution path for arbitrary vendor SDKs.
