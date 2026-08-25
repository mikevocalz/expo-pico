# expo-pico-achievements

PICO platform achievements APIs for Expo apps. Unlock, track progress, and listen for achievement events on PICO OS 6 devices.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Installation

```sh
yarn add @expo-pico/achievements react-native-nitro-modules
```

Add to `app.config.ts` after `expo-pico-core`:

```ts
plugins: [
  ['@expo-pico/core', { ... }],
  '@expo-pico/achievements',
]
```

## Requires a signed-in PICO account

`@expo-pico/account` is a runtime prerequisite for this package — progress is written against the signed-in user. It is
**not** a code-level import, so nothing here fails to compile without it; calls
simply return no data or `SERVICE_UNAVAILABLE` until a PICO account is connected.

```bash
yarn add @expo-pico/account react-native-nitro-modules
```

```ts
import { login, isAccountAvailable } from '@expo-pico/account';

if (isAccountAvailable()) {
  await login(); // connect the PICO account before calling into this package
}
```

## Status

- Maturity: alpha
- PICO Platform Service SDK (PPS) linkage: live on `picoDebug` builds. The achievements client from `com.pico.pps:platform-service-achievement:1.0.0` is pulled automatically from the public Bytedance Maven repo by `expo-pico-core`'s plugin, so no AAR drop is needed. Bridge methods only return `SERVICE_UNAVAILABLE` on the `mobile` flavor, on non-PICO hardware, or if Gradle was offline at prebuild time.
- Platform: Android only.
- Runtime target: PICO OS 6 (PICO 4, 4 Ultra, Swan), New Architecture.

## Runtime diagnostics

To check whether the `achievements` SDK surface is live at runtime:

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

if (isPlatformSdkPresent()) {
  const probe = await getPlatformSdkProbe();
  console.log('achievements SDK live:', probe.achievements);
}
```

Or run `npx expo-pico-doctor --fail-on-warning` before prebuild to catch misconfigs early.

### Configure for Android

Add `expo-pico-core` and `expo-pico-achievements` to your `app.config.ts` plugins array. `expo-pico-core` must appear first:

```ts
export default {
  plugins: [
    ['@expo-pico/core', { picoAppId: 'your-pico-app-id', buildVariant: 'pico' }],
    '@expo-pico/achievements',
  ],
};
```

Then run:

```
npx expo prebuild --clean
```

## Usage

```ts
import {
  isAchievementsAvailable,
  getAllAchievements,
  unlockAchievement,
  addAchievementCount,
  addAchievementUnlockedListener,
} from '@expo-pico/achievements';

// Guard against non-PICO builds
if (isAchievementsAvailable()) {
  const achievements = await getAllAchievements();

  // Unlock a simple achievement
  const result = await unlockAchievement('first_launch');
  console.log('Just unlocked:', result.justUnlocked);

  // Increment a count achievement
  await addAchievementCount('kills_total', 1);

  // Listen for real-time unlock events
  const sub = addAchievementUnlockedListener((event) => {
    console.log('Achievement unlocked:', event.apiName);
  });
  // Later: sub.remove();
}
```

## API

| Function                                | Description                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| `isAchievementsAvailable()`             | Returns `true` on a PICO build with the Achievements SDK linked |
| `getAchievementsSdkVersion()`           | Returns the PICO Platform SDK version string                    |
| `getAllAchievements()`                  | Fetches all achievement definitions and current progress        |
| `getUnlockedAchievements()`             | Client-side filter; returns only unlocked achievements          |
| `getAchievementProgress(apiNames)`      | Fetches progress for a subset of achievements by API name       |
| `unlockAchievement(apiName)`            | Unlocks a simple achievement; returns `justUnlocked` flag       |
| `addAchievementCount(apiName, count)`   | Increments a count achievement                                  |
| `addAchievementBitfield(apiName, bits)` | Sets bits on a bitfield achievement                             |
| `addAchievementUnlockedListener(cb)`    | Subscribes to real-time unlock events; returns `Subscription`   |

## Native artifacts

This package needs `com.pico.pps:platform-service-achievement` on the Android classpath.

**It does not declare it.** `@expo-pico/core` declares every
`com.pico.pps` coordinate once, in the app module, and this package
reaches it through `implementation project(':expo-pico-core')`. So
installing it next to other `@expo-pico/*` packages never produces a
second declaration of the same artifact.

See [docs/PPS-ARTIFACTS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PPS-ARTIFACTS.md)
for the full artifact list and the two cases that can still duplicate
(a vendored AAR shadowing the Maven copy, and version skew).

## Limitations

- Android only (PICO is an Android platform)
- New Architecture only (`newArchEnabled: true` required)
- Requires `expo-pico-core` as a peer dependency
- Some bridge methods may surface `NOT_IMPLEMENTED` until the corresponding PPS endpoint ships in a future PPS release. The PPS Maven deps themselves resolve automatically on `picoDebug` builds; no AAR drop is required.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
