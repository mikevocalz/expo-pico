/**
 * PPS 1.0.x removed RTC — every method returns NOT_IN_PPS_1_0 today. The
 * interface is kept so a future PPS release can wire it without an API break.
 * Production voice runs on Fishjam via @expo-pico/app-kit.
 *
 * The Nitro spec in PicoRtc.nitro.ts is the single source for these shapes;
 * this module keeps the `./types` import path stable.
 */
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
