import {
  guardService,
  wrapNativeCall,
  resolveHybridObject,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';

import type {
  PicoRtc,
  RtcServiceStatus,
  RtcInitOptions,
  RtcJoinOptions,
  RtcVolume,
  RtcUserJoinedEvent,
  RtcUserLeftEvent,
  RtcStateChangeEvent,
} from './PicoRtc.nitro';

export type {
  RtcServiceStatus,
  RtcAudioScenario,
  RtcJoinStatus,
  RtcLeaveReason,
  RtcConnectionState,
  RtcVolume,
  RtcInitOptions,
  RtcJoinOptions,
  RtcJoinResult,
  RtcUserJoinedEvent,
  RtcUserLeftEvent,
  RtcStateChangeEvent,
} from './PicoRtc.nitro';

export type { Subscription };

const PKG = '@expo-pico/rtc';

function native(): PicoRtc | null {
  return resolveHybridObject<PicoRtc>('PicoRtc');
}

export function isRtcAvailable(): boolean {
  return native()?.available ?? false;
}

export function getRtcServiceStatus(): RtcServiceStatus {
  return native()?.status ?? 'unavailable';
}

export function getRtcSdkVersion(): string | null {
  return native()?.sdkVersion ?? null;
}

export async function initRtcEngine(options?: RtcInitOptions): Promise<void> {
  guardService(isRtcAvailable(), PKG, 'initRtcEngine');
  await wrapNativeCall(PKG, 'initRtcEngine', native()!.initRtcEngine(options));
}

export async function joinChannel(options: RtcJoinOptions) {
  guardService(isRtcAvailable(), PKG, 'joinChannel');
  return wrapNativeCall(PKG, 'joinChannel', native()!.joinChannel(options));
}

export async function leaveChannel(): Promise<void> {
  guardService(isRtcAvailable(), PKG, 'leaveChannel');
  await wrapNativeCall(PKG, 'leaveChannel', native()!.leaveChannel());
}

export async function muteLocalAudio(muted: boolean): Promise<void> {
  guardService(isRtcAvailable(), PKG, 'muteLocalAudio');
  await wrapNativeCall(PKG, 'muteLocalAudio', native()!.muteLocalAudio(muted));
}

export async function setAudioOutputVolume(volume: RtcVolume): Promise<void> {
  guardService(isRtcAvailable(), PKG, 'setAudioOutputVolume');
  await wrapNativeCall(PKG, 'setAudioOutputVolume', native()!.setAudioOutputVolume(volume));
}

function subscribe(register: (h: PicoRtc) => number): Subscription {
  const hybrid = native();
  if (!hybrid?.available) return NULL_SUBSCRIPTION;
  const id = register(hybrid);
  return { remove: () => hybrid.removeListener(id) };
}

export function addUserJoinedListener(listener: (event: RtcUserJoinedEvent) => void): Subscription {
  return subscribe((h) => h.addUserJoinedListener(listener));
}

export function addUserLeftListener(listener: (event: RtcUserLeftEvent) => void): Subscription {
  return subscribe((h) => h.addUserLeftListener(listener));
}

export function addRtcStateChangeListener(
  listener: (event: RtcStateChangeEvent) => void
): Subscription {
  return subscribe((h) => h.addRtcStateChangeListener(listener));
}
