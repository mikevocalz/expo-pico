# expo-pico-rtc

Real-time voice communication (RTC) for PICO OS 6 apps built with Expo.

Wraps the PICO RTC SDK to provide channel-based voice comms.

## Installation

```sh
yarn add expo-pico-rtc
```

Add to `app.config.ts` after `expo-pico-core`:

```ts
plugins: [
  ['@expo-pico/core', { ... }],
  ['@expo-pico/rtc', { microphonePermission: true }],
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
} from '@expo-pico/rtc';
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

The PPS Maven artifacts that back voice / channels resolve from public
Maven on `picoDebug` builds — `expo-pico-core`'s `withPicoGradle` plugin
registers the Bytedance repo and the dependencies automatically, so no
AAR drop is required. A handful of channel-management endpoints may
still surface `NOT_IMPLEMENTED` until the matching PPS endpoint ships in
a future PPS release.

## Status

- `getRtcServiceStatus()`: implemented (SDK presence check, reflection-based)
- Most async APIs: live on `picoDebug` builds via PPS Maven. Some advanced channel-management endpoints are extension seams pending a future PPS release.

## Requirements

- `expo-pico-core >= 0.1.0` (peer)
- Expo SDK 56+
- New Architecture
- Android only

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
