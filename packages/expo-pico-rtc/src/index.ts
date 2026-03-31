import {
  guardService,
  wrapNativeCall,
  safeAddListener,
  createNativeEventEmitter,
  type Subscription,
} from '@expo-pico/platform-service-common';
import { NativeRtc } from './ExpoPicoRtcModule';
import type {
  RtcServiceStatus,
  RtcInitOptions,
  RtcJoinOptions,
  RtcJoinResult,
  RtcVolume,
  RtcUserJoinedEvent,
  RtcUserLeftEvent,
  RtcStateChangeEvent,
} from './types';

export type {
  RtcServiceStatus,
  RtcInitOptions,
  RtcJoinOptions,
  RtcJoinResult,
  RtcVolume,
  RtcUserJoinedEvent,
  RtcUserLeftEvent,
  RtcStateChangeEvent,
} from './types';

export type { Subscription };

const PKG = 'expo-pico-rtc';
const emitter = createNativeEventEmitter(NativeRtc);

// ─── Availability ─────────────────────────────────────────────────────────────

export function getRtcServiceStatus(): RtcServiceStatus {
  return NativeRtc?.rtcSdkAvailable ? 'available' : 'unavailable';
}

export function getRtcSdkVersion(): string | null {
  return NativeRtc?.rtcSdkVersion ?? null;
}

// ─── Engine lifecycle ─────────────────────────────────────────────────────────

/**
 * Initializes the PICO RTC engine.
 * Must be called before joinChannel(). Safe to call multiple times.
 * @see https://developer.picoxr.com/document/ue4/rtc/
 */
export async function initRtcEngine(options?: RtcInitOptions): Promise<void> {
  guardService(getRtcServiceStatus() === 'available', PKG, 'initRtcEngine');
  await wrapNativeCall(
    PKG, 'initRtcEngine',
    NativeRtc!.initRtcEngine({
      appId: options?.appId ?? null,
      audioScenario: options?.audioScenario ?? 'default',
    })
  );
}

/**
 * Joins a PICO RTC voice channel. Requires initRtcEngine() first.
 * @see https://developer.picoxr.com/document/ue4/rtc/
 */
export async function joinChannel(options: RtcJoinOptions): Promise<RtcJoinResult> {
  guardService(getRtcServiceStatus() === 'available', PKG, 'joinChannel');
  const raw = await wrapNativeCall(
    PKG, 'joinChannel',
    NativeRtc!.joinChannel(options.channelId, options.token, options.uid)
  );
  return raw as unknown as RtcJoinResult;
}

/** Leaves the current RTC channel. */
export async function leaveChannel(): Promise<void> {
  guardService(getRtcServiceStatus() === 'available', PKG, 'leaveChannel');
  await wrapNativeCall(PKG, 'leaveChannel', NativeRtc!.leaveChannel());
}

/** Mutes or unmutes the local microphone audio stream. */
export async function muteLocalAudio(muted: boolean): Promise<void> {
  guardService(getRtcServiceStatus() === 'available', PKG, 'muteLocalAudio');
  await wrapNativeCall(PKG, 'muteLocalAudio', NativeRtc!.muteLocalAudio(muted));
}

/**
 * Sets the audio output volume for all remote participants.
 * @param volume 0 (silent) to 100 (max device volume)
 */
export async function setAudioOutputVolume(volume: RtcVolume): Promise<void> {
  guardService(getRtcServiceStatus() === 'available', PKG, 'setAudioOutputVolume');
  await wrapNativeCall(PKG, 'setAudioOutputVolume', NativeRtc!.setAudioOutputVolume(volume));
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

export function addUserJoinedListener(
  listener: (event: RtcUserJoinedEvent) => void
): Subscription {
  return safeAddListener<RtcUserJoinedEvent>(emitter, 'onRtcUserJoined', listener);
}

export function addUserLeftListener(
  listener: (event: RtcUserLeftEvent) => void
): Subscription {
  return safeAddListener<RtcUserLeftEvent>(emitter, 'onRtcUserLeft', listener);
}

export function addRtcStateChangeListener(
  listener: (event: RtcStateChangeEvent) => void
): Subscription {
  return safeAddListener<RtcStateChangeEvent>(emitter, 'onRtcStateChange', listener);
}
