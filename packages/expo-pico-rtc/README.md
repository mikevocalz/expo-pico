# expo-pico-rtc

[![unavailable](https://img.shields.io/badge/PPS_1.0.x-unavailable-6B7280?style=flat-square)](../../README.md#packages)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](../../docs/FAQ.md)

Typed seam for real-time voice communication (RTC) on PICO OS 6.

> ## Unavailable on PPS 1.0.x
>
> **PPS 1.0.x removed RTC.** There is no `platform-service-rtc` artifact on
> the PICO repo, so nothing here can be wired — this is not a missing
> integration that can be reverse-engineered, the service does not exist.
> Every async method rejects with `NOT_IN_PPS_1_0`, on device and off.
>
> `ppsArtifacts.ts` maps `@expo-pico/rtc` to an empty service list, which is
> the machine-readable form of the same fact.
>
> **Use [`@fishjam-cloud/react-native-webrtc`](https://www.npmjs.com/package/@fishjam-cloud/react-native-webrtc)
> instead.** `@expo-pico/app-kit` already probes for it at runtime.
>
> The package is kept as a typed seam so a future PPS release can be wired
> without an API break. Do not build against it today.

## Installation

```sh
yarn add @expo-pico/rtc react-native-nitro-modules
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
const sub = addUserJoinedListener((e) => console.log('joined:', e.uid));
// cleanup:
sub.remove();
```

## Extension Seams

There are none to activate. Unlike `account` or `iap`, no PPS Maven artifact
backs this package — `expo-pico-core`'s Gradle plugin adds no RTC dependency
because none is published. No build flavor, hardware, or AAR drop changes the
result.

## Status

- `getRtcServiceStatus()`: implemented — always reports unavailable, since no
  RTC service exists to detect.
- **Every async API: `NOT_IN_PPS_1_0`.** Not "pending a future release" in any
  scheduled sense; PPS 1.0.x deleted the surface.

## Requirements

- `expo-pico-core >= 0.1.0` (peer)
- Expo SDK 56+
- New Architecture
- Android only

## Native artifacts

This package declares no Maven coordinate of its own. It has no PICO
Platform Service artifact behind it — see
[docs/PPS-WIRING-GAPS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PPS-WIRING-GAPS.md)
— and reaches whatever native code it needs through
`@expo-pico/core`. Installing it alongside other `@expo-pico/*`
packages adds nothing to the Android classpath that is not already
there.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
