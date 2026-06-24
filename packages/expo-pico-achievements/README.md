# expo-pico-achievements

PICO platform achievements APIs for Expo apps. Unlock, track progress, and listen for achievement events on PICO OS 6 devices.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Status

- Maturity: alpha
- PICO Platform SDK linkage: extension seam. Bridge methods return `SERVICE_UNAVAILABLE` until the PICO Platform SDK AAR is on the classpath.
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

| Function | Description |
| --- | --- |
| `isAchievementsAvailable()` | Returns `true` on a PICO build with the Achievements SDK linked |
| `getAchievementsSdkVersion()` | Returns the PICO Platform SDK version string |
| `getAllAchievements()` | Fetches all achievement definitions and current progress |
| `getUnlockedAchievements()` | Client-side filter; returns only unlocked achievements |
| `getAchievementProgress(apiNames)` | Fetches progress for a subset of achievements by API name |
| `unlockAchievement(apiName)` | Unlocks a simple achievement; returns `justUnlocked` flag |
| `addAchievementCount(apiName, count)` | Increments a count achievement |
| `addAchievementBitfield(apiName, bits)` | Sets bits on a bitfield achievement |
| `addAchievementUnlockedListener(cb)` | Subscribes to real-time unlock events; returns `Subscription` |

## Limitations

- Android only (PICO is an Android platform)
- New Architecture only (`newArchEnabled: true` required)
- Requires `expo-pico-core` as a peer dependency
- Bridge methods return `NOT_IMPLEMENTED` until the PICO Platform SDK AAR is linked

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
