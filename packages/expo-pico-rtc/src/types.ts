/**
 * RTC service availability and engine state.
 * @see https://developer.picoxr.com/document/ue4/rtc/
 */
export type RtcServiceStatus = 'available' | 'unavailable' | 'initializing' | 'error';

/**
 * RTC engine initialization options.
 */
export interface RtcInitOptions {
  /**
   * PICO platform app ID. If omitted, read from expo-pico-core BuildConfig.
   * Most apps should leave this unset and rely on core.
   */
  appId?: string;
  /**
   * Audio scenario profile.
   * - 'default': Standard VoIP quality
   * - 'music': Higher fidelity for music-over-voice use cases
   * - 'gaming': Optimized for low-latency gaming comms
   */
  audioScenario?: 'default' | 'music' | 'gaming';
}

/**
 * Options for joining an RTC channel.
 */
export interface RtcJoinOptions {
  /** The channel name / room identifier. Max 64 chars, alphanumeric + _ */
  channelId: string;
  /**
   * Authentication token for the channel.
   * Extension seam: token generation is server-side; this module only passes
   * the token through to the SDK.
   */
  token: string;
  /**
   * Numeric user ID for this participant.
   * Must be unique within the channel. 0 = SDK auto-assigns.
   */
  uid: number;
}

export type RtcJoinResult =
  | { status: 'joined'; channelId: string; uid: number }
  | { status: 'error'; code: string; message: string };

/**
 * Audio output volume: 0 (silent) to 100 (max).
 */
export type RtcVolume = number;

/**
 * Event fired when a remote user joins the current channel.
 */
export interface RtcUserJoinedEvent {
  uid: number;
  channelId: string;
  elapsed: number;
}

/**
 * Event fired when a remote user leaves the current channel.
 */
export interface RtcUserLeftEvent {
  uid: number;
  channelId: string;
  /** Reason the user left: 'quit' | 'dropped' | 'kicked' */
  reason: 'quit' | 'dropped' | 'kicked';
}

/**
 * Event fired when the local RTC engine state changes.
 */
export interface RtcStateChangeEvent {
  state: 'connected' | 'reconnecting' | 'failed' | 'disconnected';
  reason: string;
}

export interface ExpoPicoRtcModuleInterface {
  rtcSdkAvailable: boolean;
  rtcSdkVersion: string | null;
}
