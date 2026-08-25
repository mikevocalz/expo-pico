# expo-pico-rooms

PICO platform room lifecycle for Expo apps.

Provides room creation, joining, and membership management on top of the PICO
Platform SDK social interaction layer.

> **Matchmaking is not available.** PPS 1.0.x ships no matchmaking surface, so
> `requestMatchmaking()` and `cancelMatchmaking()` always throw
> `NOT_IMPLEMENTED` — on device as well as off. They are kept as typed seams so
> a future PPS release can wire them without an API break. See
> [Matchmaking](#matchmaking) below for the supported alternative.

## Installation

```sh
yarn add @expo-pico/rooms react-native-nitro-modules
```

Add to `app.config.ts` after `expo-pico-core`:

```ts
plugins: [
  ['@expo-pico/core', { ... }],
  '@expo-pico/rooms',
]
```

## API

```ts
import {
  isRoomsSdkAvailable,
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomInfo,
  kickUser,
  updateRoomData,
  requestMatchmaking,
  cancelMatchmaking,
  addRoomUpdatedListener,
  addRoomUserJoinedListener,
  addRoomUserLeftListener,
  addMatchmakingFoundListener,
} from '@expo-pico/rooms';
```

### Room lifecycle

```ts
const result = await createRoom({ joinPolicy: 'friends-only', maxMembers: 8 });
if (result.status === 'success') {
  console.log(result.room.roomId);
}
```

### Matchmaking

Not implemented — `requestMatchmaking()` and `cancelMatchmaking()` throw
`NOT_IMPLEMENTED` unconditionally, and `addMatchmakingFoundListener()` never
fires. PPS 1.0.x removed the matchmaking surface in the PVR->PPS rewrite.

The supported path is to create a room and invite into it:

```ts
import { createRoom } from '@expo-pico/rooms';
import { sendInvites } from '@expo-pico/social';

const room = await createRoom({ joinPolicy: 'invite-only' });

// InviteOptions carries no roomId field — pass it through `data`.
await sendInvites({
  destinationApiName: 'my_destination',
  userIds: [friendUserId], // up to 8
  data: { roomId: room.roomId },
});
```

## Extension Seams

PPS friend / social Maven artifacts (`com.pico.pps:platform-service-friend:1.0.0`, `…:social:1.0.0`) resolve automatically on `picoDebug` builds — no AAR drop is required. Matchmaking is not a partially-wired endpoint: PPS 1.0.x has no matchmaking API at all, so both matchmaking calls throw `NOT_IMPLEMENTED` regardless of build flavor or hardware.

## Status

- `isRoomsSdkAvailable()`: implemented (SDK presence check)
- All async APIs: extension seams

## Requirements

- `expo-pico-core >= 0.1.0` (peer)
- Expo SDK 56+
- New Architecture
- Android only

## Native artifacts

This package needs `com.pico.pps:platform-service-friend` on the Android classpath.

**It does not declare it.** `@expo-pico/core` declares every
`com.pico.pps` coordinate once, in the app module, and this package
reaches it through `implementation project(':expo-pico-core')`. So
installing it next to other `@expo-pico/*` packages never produces a
second declaration of the same artifact.

`platform-service-friend` is shared with `@expo-pico/social`. Installing both emits one line, not two.

See [docs/PPS-ARTIFACTS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PPS-ARTIFACTS.md)
for the full artifact list and the two cases that can still duplicate
(a vendored AAR shadowing the Maven copy, and version skew).

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
