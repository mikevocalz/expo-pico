# PICO SDK AARs — Manual Download Required

This directory holds PICO SDK AARs that **cannot be bundled in the npm packages**
due to their proprietary license. You must download them manually from the
PICO Developer Console before building a PICO-targeted APK.

## Required Files

| File | Source | Purpose |
|------|--------|---------|
| `pico-platform-sdk.aar` | PPS Developer Console → App Information → SDK Download | Controller haptics (`PXR_Plugin`), IAP, account |
| `pico-spatial-sdk.aar`  | PPS Developer Console → App Information → SDK Download | Eye gaze, scene mesh, face tracking, body tracking, spatial anchors |

## Download Steps

1. Log in to [PICO Developer Console](https://developer.picoxr.com/)
2. Navigate to **App Information → SDK Download**
3. Download the **PICO Platform SDK** AAR and rename it `pico-platform-sdk.aar`
4. Download the **PICO Spatial SDK** AAR and rename it `pico-spatial-sdk.aar`
5. Place both files in this directory (`vendor/pico-sdk/`)

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
