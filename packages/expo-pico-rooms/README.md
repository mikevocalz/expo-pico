# expo-pico-rooms

PICO platform room lifecycle and matchmaking for Expo apps.

Provides room creation, joining, membership management, and matchmaking
on top of the PICO Platform SDK social interaction layer.

## Installation

```sh
yarn add expo-pico-rooms
```

Add to `app.config.ts` **after** `expo-pico-core`:

```ts
plugins: [
  ['expo-pico-core', { ... }],
  'expo-pico-rooms',
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
} from 'expo-pico-rooms';
```

### Room lifecycle

```ts
const result = await createRoom({ joinPolicy: 'friends-only', maxMembers: 8 });
if (result.status === 'success') {
  console.log(result.room.roomId);
}
```

### Matchmaking

```ts
const sub = addMatchmakingFoundListener(e => {
  console.log('matched into room:', e.roomId);
});
await requestMatchmaking({ poolName: 'ranked-4v4' });
// cleanup
sub.remove();
```

## Extension Seams

All async APIs are extension seams pending PICO Platform SDK AAR integration.

## Status

- `isRoomsSdkAvailable()` — implemented (SDK presence check)
- All async APIs — extension seams

## Requirements

- `expo-pico-core >= 0.1.0` (peer)
- Expo SDK 55+
- New Architecture
- Android only

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)
- [ARCHITECTURE §17](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#17-platform-sdk-identity-phase-b)
- [ARCHITECTURE §22 — Reflection-based SDK detection](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md#22-reflection-based-pico-platform-sdk-detection-phase-j)

## License

MIT
