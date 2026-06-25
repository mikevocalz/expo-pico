# PICO SDK AARs — Legacy PVR-prefixed SDKs Only

> **Heads up.** The modern **PICO Platform Service SDK (PPS)** —
> `com.pico.pps:platform-service-{auth,iap,friend,social,achievement,
> leaderboard,push,entitlement,compliance,sport,speech}:1.0.0` — is
> resolved automatically from the public Bytedance Maven repo
> (`https://artifact.bytedance.com/repository/Volcengine/`) by
> `expo-pico-core`'s `withPicoGradle` plugin. **You do NOT drop those
> into this directory.** PPS-backed siblings (account, IAP, social,
> friend, leaderboards, achievements, notifications, subscription,
> rooms, RTC, storage) get the modern client classes from Maven on
> every `picoDebug` build.
>
> This directory only holds the **legacy PVR-prefixed AARs** that PICO
> still distributes through the Developer Console rather than public
> Maven — used by `expo-pico-core`'s programmatic `setPassthrough()` /
> `PXR_Plugin` haptics and by all of `expo-pico-spatial`. Those AARs
> remain proprietary and cannot be bundled in the npm packages.

## Required Files (legacy PVR SDKs)

| File | Source | Purpose |
|------|--------|---------|
| `pico-platform-sdk.aar` (legacy PVR Platform SDK 3.x) | PICO Developer Console → App Information → SDK Download | `PXR_Plugin` programmatic passthrough toggle + controller haptics |
| `pico-spatial-sdk.aar`  (legacy PVR Spatial SDK 1.x) | PICO Developer Console → App Information → SDK Download | Spatial anchors, scene mesh, eye/face/body tracking, space transitions |

## Download Steps

1. Log in to [PICO Developer Console](https://developer.picoxr.com/)
2. Navigate to **App Information → SDK Download**
3. Download the **legacy PVR-prefixed Platform SDK** (3.x) and rename it `pico-platform-sdk.aar`
4. Download the **legacy PVR-prefixed Spatial SDK** (1.x) and rename it `pico-spatial-sdk.aar`
5. Place both files in this directory (`vendor/pico-sdk/`)

These are **not** the modern PPS Maven artifacts. PPS pulls in via Gradle
on every `picoDebug` build with no manual download.

## Gradle Wiring

All `expo-pico-*` packages reference these AARs via:

```groovy
compileOnly fileTree(dir: '../../vendor/pico-sdk', include: ['*.aar'])
```

The consumer app (`digivision/`) may alternatively place the AARs under
`android/app/libs/` and reference them there — whichever path is used,
ensure the AARs are present before running `./gradlew assemblePicoDebug`.

## License

These AARs are distributed under the PICO Developer Agreement. They may
**not** be committed to public repositories, bundled in published npm
packages, or redistributed outside of your own build environment.

This directory is listed in `.gitignore`:

```
vendor/pico-sdk/*.aar
```

## Reflection-Safe Builds

All `expo-pico-*` native modules use `Class.forName` reflection to probe
for SDK classes at runtime. If the AARs are absent the modules degrade
gracefully: every capability check returns `false` and every SDK call
rejects with `SERVICE_UNAVAILABLE`. The app will not crash.
