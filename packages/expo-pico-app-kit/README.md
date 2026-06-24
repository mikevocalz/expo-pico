# expo-pico-app-kit

App-side orchestration layer for the `expo-pico-*` family. One import,
typed wrappers, capability cache, no-op-safe everywhere.

```ts
import { bootPico, getPicoCapabilities, haptics, onGaze, account } from '@expo-pico/app-kit';
```

## What it does

- `bootPico(options)`. Call once at app start. Probes every
  `expo-pico-*` native module via reflection, caches the result,
  applies the requested 2D panel dimensions via
  `setWindowContainerProperties` when the Spatial SDK is present.
- `getPicoCapabilities()`. Synchronous snapshot of every
  capability. Renders dimmed UI for absent SDKs without an async hop.
- `haptics.{tap,confirm,warn,grab,drop}(hand)`. Semantic haptic
  helpers that map to amplitude and duration internally. Safe no-op when
  the Pico Native SDK AAR isn't on the classpath.
- `onGaze / onSceneMeshUpdate / onFace / onBody`. Event listeners
  that return a `Subscription` (or a `NULL_SUB` no-op when the
  Spatial SDK is absent).
- `createAnchor / requestFullSpace / setWindowContainerProperties`.
  Async Spatial SDK calls. Return `null` or `false` instead of
  throwing when the SDK isn't on the classpath.
- `account / iap / achievement / leaderboard / friend / push / social`.
  Lazy Proxy wrappers over each PPS module. Calling a method when
  the bridge is absent returns a rejected Promise so app code's
  `.catch()` paths get hit deterministically.

## What it doesn't do

- Doesn't ship the auth-gated Pico Native SDK or Spatial SDK AARs.
  Those have to be downloaded from
  [developer.picoxr.com](https://developer.picoxr.com) and dropped
  into your app's `android/app/libs/`.
- Doesn't change capability detection logic. That lives in
  `expo-pico-core`'s `PicoPlatformSdkDetector` and each sibling's
  `*Utils.kt`. This package just composes their JS surfaces.
- Doesn't render any UI. For the in-XR diagnostic HUD pattern, look
  at the digivision app's `components/PicoXRFeatures.tsx` and
  `components/PicoSdkStatus.tsx`.

## Boot wiring

```tsx
// app/_layout.tsx
import { useEffect } from 'react';
import { bootPico } from '@expo-pico/app-kit';

export default function RootLayout() {
  useEffect(() => {
    bootPico({
      width: 1280,
      height: 800,
      minWidth: 800,
      minHeight: 560,
    });
  }, []);
  // …
}
```

In dev (`__DEV__`) the boot logs the capability table:

```
[pico] runtime capabilities:
  yes account
  yes iap
  yes achievement
  yes leaderboard
  yes friend
  yes push
  yes social
  no  haptics
  no  windowContainer
  no  eyeGaze
  no  sceneMesh
  no  faceTracking
  no  bodyTracking
  yes spatialAudio
  yes handTracking
  yes passthrough
  yes controllers
```

## AAR drop-in

The seven `account / iap / achievement / leaderboard / friend / push /
social` rows go live automatically when you add the PICO Platform Service
SDK from the Bytedance maven (`expo-pico-core`'s gradle plugin wires
the repo URL for you). Drop the matching `com.pico.pps:platform-service-*`
dependencies in your app's `build.gradle` under `picoImplementation`.

The remaining six rows (`haptics`, `windowContainer`, `eyeGaze`,
`sceneMesh`, `faceTracking`, `bodyTracking`) go live once you:

1. Sign in to developer.picoxr.com
2. Download the PICO Native SDK (haptics) and PICO Spatial
   SDK (everything else) AARs
3. Drop the .aar files into `android/app/libs/`
4. Add `picoImplementation fileTree(dir: 'libs', include: ['*.aar'])`
   to your app's `build.gradle`
5. Rebuild

The wrappers detect the new classes on the classpath via reflection.
No JS-side change required.

## Peer deps

- `expo` >=56.0.0
- `react-native` matches Expo SDK 56 (0.86)
- `expo-pico-core`, `expo-pico-spatial` are required peers
- Other PPS sibling packages are optional peers. Install only the
  surfaces you use; the wrappers Proxy-reject cleanly when a
  package isn't installed
