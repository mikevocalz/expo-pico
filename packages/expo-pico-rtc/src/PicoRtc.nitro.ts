import type { HybridObject } from 'react-native-nitro-modules';

/**
 * PPS 1.0.x removed RTC — every method returns NOT_IN_PPS_1_0 today. The
 * interface is kept so a future PPS release can wire it without an API break.
 * Production voice runs on Fishjam via @expo-pico/app-kit.
 */

export type RtcServiceStatus = 'available' | 'unavailable' | 'initializing' | 'error';
export type RtcAudioScenario = 'default' | 'music' | 'gaming';
export type RtcJoinStatus = 'joined' | 'error';
export type RtcLeaveReason = 'quit' | 'dropped' | 'kicked';
export type RtcConnectionState = 'connected' | 'reconnecting' | 'failed' | 'disconnected';

/** 0 (silent) to 100 (max). */
export type RtcVolume = number;

export interface RtcInitOptions {
  /** Falls back to expo-pico-core's BuildConfig when unset — the usual case. */
  appId?: string;
  audioScenario?: RtcAudioScenario;
}

export interface RtcJoinOptions {
  /** Max 64 chars, alphanumeric + underscore. */
  channelId: string;
  /** Minted server-side; this module only passes it through. */
  token: string;
  /** Unique within the channel. 0 lets the SDK assign one. */
  uid: number;
}

/**
 * Flattened from a discriminated union — Nitro structs cannot model one.
 * `joined` populates channelId/uid; `error` populates code/message.
 */
export interface RtcJoinResult {
  status: RtcJoinStatus;
  channelId?: string;
  uid?: number;
  code?: string;
  message?: string;
}

export interface RtcUserJoinedEvent {
  uid: number;
  channelId: string;
  elapsed: number;
}

export interface RtcUserLeftEvent {
  uid: number;
  channelId: string;
  reason: RtcLeaveReason;
}

export interface RtcStateChangeEvent {
  state: RtcConnectionState;
  reason: string;
}

export interface PicoRtc extends HybridObject<{ android: 'kotlin' }> {
  readonly available: boolean;
  readonly sdkVersion?: string;
  readonly status: RtcServiceStatus;

  initRtcEngine(options?: RtcInitOptions): Promise<void>;
  joinChannel(options: RtcJoinOptions): Promise<RtcJoinResult>;
  leaveChannel(): Promise<void>;
  muteLocalAudio(muted: boolean): Promise<void>;
  setAudioOutputVolume(volume: RtcVolume): Promise<void>;

  addUserJoinedListener(listener: (event: RtcUserJoinedEvent) => void): number;
  addUserLeftListener(listener: (event: RtcUserLeftEvent) => void): number;
  addRtcStateChangeListener(listener: (event: RtcStateChangeEvent) => void): number;
  removeListener(id: number): void;
}
