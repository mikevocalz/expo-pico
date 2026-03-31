# expo-pico-achievements

PICO platform achievements APIs for Expo apps — unlock, track progress, and listen for achievement events on PICO OS 6 devices.

# API documentation

- [Documentation for the latest stable release](https://docs.expo.dev/versions/latest/sdk/pico-achievements/)
- [Documentation for the main branch](https://docs.expo.dev/versions/unversioned/sdk/pico-achievements/)

# Installation in managed Expo projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, please follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If you follow the link and there is no documentation available then this library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

### Add the package to your npm dependencies

```
npm install expo-pico-achievements
```

### Configure for Android

Add `expo-pico-core` and `expo-pico-achievements` to your `app.config.ts` plugins array. `expo-pico-core` must appear first:

```ts
export default {
  plugins: [
    ['expo-pico-core', { picoAppId: 'your-pico-app-id', buildVariant: 'pico' }],
    'expo-pico-achievements',
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
} from 'expo-pico-achievements';

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
| `getUnlockedAchievements()` | Client-side filter — returns only unlocked achievements |
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

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide]( https://github.com/expo/expo#contributing).
