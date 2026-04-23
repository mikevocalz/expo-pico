# expo-pico-rtc

Real-time voice communication (RTC) for PICO OS 6 apps built with Expo.

Wraps the PICO RTC SDK to provide channel-based voice comms.

## Installation

```sh
yarn add expo-pico-rtc
```

Add to `app.config.ts` **after** `expo-pico-core`:

```ts
plugins: [
  ['expo-pico-core', { ... }],
  ['expo-pico-rtc', { microphonePermission: true }],
]
```

## API

```ts
import {
  getRtcServiceStatus,
  initRtcEngine,
  joinChannel,
  leaveChannel,
  muteLocalAudio,
  setAudioOutputVolume,
  addUserJoinedListener,
  addUserLeftListener,
  addRtcStateChangeListener,
} from 'expo-pico-rtc';
```

### `getRtcServiceStatus(): RtcServiceStatus`

Synchronous. Returns `'available'` if the PICO RTC SDK is present, `'unavailable'` otherwise.

### `initRtcEngine(options?): Promise<void>`

Initialize the RTC engine. Call once before joining channels.

### `joinChannel(options): Promise<RtcJoinResult>`

Join a voice channel by ID. Requires a server-generated token.

### `leaveChannel(): Promise<void>`

Leave the current channel.

### `muteLocalAudio(muted: boolean): Promise<void>`

Mute or unmute the local microphone.

### `setAudioOutputVolume(volume: number): Promise<void>`

Set playback volume (0-100).

### Events

```ts
const sub = addUserJoinedListener(e => console.log('joined:', e.uid));
// cleanup:
sub.remove();
```

## Extension Seams

All async APIs are extension seams pending PICO RTC SDK AAR integration.
They throw descriptive errors until the native SDK is linked.

## Status

- `getRtcServiceStatus()` — implemented (SDK presence check)
- All async APIs — extension seams (SDK not yet linked)

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
