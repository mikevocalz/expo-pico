# expo-pico-leaderboards

PICO platform leaderboard APIs for Expo apps. Query rankings, write scores, and paginate entries on PICO OS 6 devices.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Status

- Maturity: alpha
- PICO Platform Service SDK (PPS) linkage: live on `picoDebug` builds. The `LeaderboardClient` from `com.pico.pps:platform-service-leaderboard:1.0.0` is pulled automatically from the public Bytedance Maven repo by `expo-pico-core`'s plugin, so no AAR drop is needed. Bridge methods only return `SERVICE_UNAVAILABLE` on the `mobile` flavor, on non-PICO hardware, or if Gradle was offline at prebuild time.
- Platform: Android only.
- Runtime target: PICO OS 6 (PICO 4, 4 Ultra, Swan), New Architecture.

## Runtime diagnostics

To check whether the `leaderboards` SDK surface is live at runtime:

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

if (isPlatformSdkPresent()) {
  const probe = await getPlatformSdkProbe();
  console.log('leaderboards SDK live:', probe.leaderboards);
}
```

Or run `npx expo-pico-doctor --fail-on-warning` before prebuild to catch misconfigs early.

### Configure for Android

Add `expo-pico-core` and `expo-pico-leaderboards` to your `app.config.ts` plugins array. `expo-pico-core` must appear first:

```ts
export default {
  plugins: [
    ['@expo-pico/core', { picoAppId: 'your-pico-app-id', buildVariant: 'pico' }],
    '@expo-pico/leaderboards',
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
} from '@expo-pico/leaderboards';

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
- Some bridge methods may surface `NOT_IMPLEMENTED` until the corresponding PPS endpoint ships in a future PPS release. The PPS Maven deps themselves resolve automatically on `picoDebug` builds; no AAR drop is required.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
