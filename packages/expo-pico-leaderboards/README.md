# expo-pico-leaderboards

PICO platform leaderboard APIs for Expo apps — query rankings, write scores, and paginate entries on PICO OS 6 devices.

# API documentation

- [Documentation for the latest stable release](https://docs.expo.dev/versions/latest/sdk/pico-leaderboards/)
- [Documentation for the main branch](https://docs.expo.dev/versions/unversioned/sdk/pico-leaderboards/)

# Installation in managed Expo projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, please follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If you follow the link and there is no documentation available then this library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

### Add the package to your npm dependencies

```
npm install expo-pico-leaderboards
```

### Configure for Android

Add `expo-pico-core` and `expo-pico-leaderboards` to your `app.config.ts` plugins array. `expo-pico-core` must appear first:

```ts
export default {
  plugins: [
    ['expo-pico-core', { picoAppId: 'your-pico-app-id', buildVariant: 'pico' }],
    'expo-pico-leaderboards',
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
  isLeaderboardsAvailable,
  getAllLeaderboards,
  writeScore,
  getEntries,
  getUserEntry,
} from 'expo-pico-leaderboards';

if (isLeaderboardsAvailable()) {
  // Write a score
  const result = await writeScore('weekly_high_score', 9500, { forceUpdate: false });
  console.log('Score updated:', result.didUpdate, 'Rank:', result.newRank);

  // Paginate top entries
  const page = await getEntries('weekly_high_score', {
    filter: 'none',
    startAt: 'top',
    pageSize: 20,
  });
  console.log('Top entries:', page.items);

  // Fetch next page
  if (page.nextPageToken) {
    const next = await getEntries('weekly_high_score', { pageToken: page.nextPageToken });
  }

  // Get the current user's entry
  const mine = await getUserEntry('weekly_high_score');
  console.log('My rank:', mine?.rank);
}
```

## API

| Function | Description |
| --- | --- |
| `isLeaderboardsAvailable()` | Returns `true` on a PICO build with the Leaderboards SDK linked |
| `getLeaderboardsSdkVersion()` | Returns the PICO Platform SDK version string |
| `getAllLeaderboards()` | Lists all leaderboard definitions for the app |
| `getEntries(apiName, options?)` | Returns a paginated page of leaderboard entries |
| `getEntriesAfterRank(apiName, afterRank, options?)` | Returns entries starting after the given rank |
| `getUserEntry(apiName)` | Returns the current user's entry, or `null` if not on the board |
| `writeScore(apiName, score, options?)` | Writes a score; returns `didUpdate`, `previousScore`, and `newRank` |

### Pagination

All paginated methods return `PicoPage<T>`:

```ts
interface PicoPage<T> {
  items: T[];
  nextPageToken: string | null;
  totalCount: number;
}
```

Pass `nextPageToken` as `options.pageToken` in the next call to advance pages.

## Limitations

- Android only (PICO is an Android platform)
- New Architecture only (`newArchEnabled: true` required)
- Requires `expo-pico-core` as a peer dependency
- Bridge methods return `NOT_IMPLEMENTED` until the PICO Platform SDK AAR is linked

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide]( https://github.com/expo/expo#contributing).
