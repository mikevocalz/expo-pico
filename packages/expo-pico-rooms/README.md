# expo-pico-rooms

PICO platform room lifecycle for Expo apps.

Provides room creation, joining, and membership management on top of the PICO
Platform SDK social interaction layer.

> ## Read-only on PPS 1.0.x
>
> **PPS 1.0.x removed dedicated rooms.** The only surviving surface is
> _read-only_ and comes from the `friend` service, which is why
> `ppsArtifacts.ts` maps this package to `['friend']` and nothing else.
>
> In practice that means exactly one working method: `getRoomInfo(roomId)`,
> which filters `friend.getFriendsAndRooms()` under the hood. It therefore only
> resolves rooms **a friend is currently in**, and it throws `ROOM_NOT_FOUND`
> otherwise. `memberCount` is the room's own count while `members` lists only
> the friends visible in that feed, so the two legitimately disagree. PPS
> attaches no key/value payload to a room, so `data` is always empty.
>
> There is no "list rooms" export — PPS's `getFriendsAndRooms()` is not
> surfaced directly. See [PPS-WIRING-GAPS.md](../../docs/PPS-WIRING-GAPS.md).
>
> Everything that mutates room state — `createRoom`, `joinRoom`, `leaveRoom`,
> `kickUser`, `updateRoomData`, `requestMatchmaking`, `cancelMatchmaking` —
> rejects with `NOT_IN_PPS_1_0` on device and off. There is no PICO API left to
> wire them to.
>
> **For create/join/run state, use a real-time backend:**
> [Fishjam](https://fishjam.io) or [Colyseus](https://colyseus.io), keyed off
> `getUserProfile().userId` from `@expo-pico/account`.
>
> The mutating methods are kept as typed seams so a future PPS release can wire
> them without an API break.

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
`NOT_IN_PPS_1_0` unconditionally, and `addMatchmakingFoundListener()` never
fires. PPS 1.0.x removed the matchmaking surface in the PVR->PPS rewrite.

`createRoom()` is not a fallback here — it rejects too. Own the room state in a
real-time backend and use PICO only for identity and for surfacing the invite:

```ts
import { getUserProfile } from '@expo-pico/account';
import { sendInvites } from '@expo-pico/social';

// Your backend (Fishjam / Colyseus) owns the room and returns its id.
const { userId } = await getUserProfile();
const roomId = await myBackend.createRoom({ hostUserId: userId });

// PICO social still delivers the invite. InviteOptions has no roomId field,
// so carry it in `data`.
await sendInvites({
  destinationApiName: 'my_destination',
  userIds: [friendUserId], // up to 8
  data: { roomId },
});
```

## Extension Seams

PPS friend / social Maven artifacts (`com.pico.pps:platform-service-friend:1.0.0`, `…:social:1.0.0`) resolve automatically on `picoDebug` builds — no AAR drop is required. Matchmaking is not a partially-wired endpoint: PPS 1.0.x has no matchmaking API at all, so both matchmaking calls throw `NOT_IMPLEMENTED` regardless of build flavor or hardware.

## Status

- `isRoomsSdkAvailable()`: implemented (SDK presence check)
- `getRoomInfo(roomId)`: backed by the `friend` service; resolves only rooms a
  friend is currently in.
- Every mutating API (`createRoom`, `joinRoom`, `leaveRoom`, `kickUser`,
  `updateRoomData`, matchmaking): `NOT_IN_PPS_1_0`.

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
