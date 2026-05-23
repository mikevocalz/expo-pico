# expo-pico-leaderboards

PICO platform leaderboard APIs for Expo apps — query rankings, write scores, and paginate entries on PICO OS 6 devices.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family. See [ARCHITECTURE.md](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md) for design rationale.

## Status

- **Maturity:** alpha
- **PICO Platform SDK linkage:** extension seam. Bridge methods return `SERVICE_UNAVAILABLE` until the PICO Platform SDK AAR is on the classpath.
- **Platform:** Android only.
- **Runtime target:** PICO OS 6 (PICO 4, 4 Ultra, Swan), New Architecture.

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
- Bridge methods return `NOT_IMPLEMENTED` until the PICO Platform SDK AAR is linked

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)
- [ARCHITECTURE §17](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#17-platform-sdk-identity-phase-b)
- [ARCHITECTURE §22 — Reflection-based SDK detection](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#22-reflection-based-pico-platform-sdk-detection-phase-j)

## License

MIT
