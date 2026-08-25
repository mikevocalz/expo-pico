# expo-pico-rooms

[![partial](https://img.shields.io/badge/PPS_1.0.x-partial-946200?style=flat-square)](../../README.md#packages)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](../../docs/FAQ.md)

PICO platform room lifecycle for Expo apps.

Read-only room discovery on top of the PICO Platform SDK friend service.
Creation, joining and membership management are **not** available — see below.

> ## Read-only on PPS 1.0.x
>
> **PPS 1.0.x removed dedicated rooms.** The only surviving surface is
> _read-only_ and comes from the `friend` service, which is why
> `ppsArtifacts.ts` maps this package to `['friend']` and nothing else.
>
> In practice that means two working methods, both reading the same feed:
> `getFriendsAndRooms()` for the whole feed and `getRoomInfo(roomId)` for one
> entry. Both only see rooms **a friend is currently in**; `getRoomInfo` throws
> `ROOM_NOT_FOUND` otherwise, while `getFriendsAndRooms` returns `[]`.
>
> Read `memberCount` carefully: it counts the friends visible in that room —
> the same entries as `members` — not the room's true occupancy, which PPS does
> not report. `maxMembers` is the only real capacity figure, and `data` is
> always empty because PPS attaches no key/value payload to a room.
>
> Note that PPS marks `getFriendsAndRooms` `@Deprecated("Legacy")` in the 1.0.0
> artifact with no named replacement, so even this read path is on notice.
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
  isRoomsAvailable,
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

// PICO social delivers the invite, but it carries no payload: the real PPS
// call is sendInvites(userIds, destinationApiName) and the `data` map on the
// TS options is dropped on the floor (see HybridPicoSocial.sendInvites). The
// room id has to travel out of band — encode it into the destination, or let
// the invitee ask your backend which room the inviter is in.
await sendInvites({
  destinationApiName: destinationForRoom(roomId),
  userIds: [friendUserId], // up to 8
});
```

## Extension Seams

PPS friend / social Maven artifacts (`com.pico.pps:platform-service-friend:1.0.0`, `…:social:1.0.0`) resolve automatically on `picoDebug` builds — no AAR drop is required. Matchmaking is not a partially-wired endpoint: PPS 1.0.x has no matchmaking API at all, so both matchmaking calls throw `NOT_IMPLEMENTED` regardless of build flavor or hardware.

## Status

- `isRoomsAvailable()`: implemented (SDK presence check)
- `getFriendsAndRooms()`: backed by the `friend` service; the whole discovery
  feed, `[]` when no friend is in a room.
- `getRoomInfo(roomId)`: same feed filtered to one id; throws `ROOM_NOT_FOUND`
  when no friend is in that room.
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
