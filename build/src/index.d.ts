import { type Subscription } from '@expo-pico/platform-service-common';
import type { RtcServiceStatus, RtcInitOptions, RtcJoinOptions, RtcVolume, RtcUserJoinedEvent, RtcUserLeftEvent, RtcStateChangeEvent } from './types';
export type { RtcServiceStatus, RtcAudioScenario, RtcJoinStatus, RtcLeaveReason, RtcConnectionState, RtcVolume, RtcInitOptions, RtcJoinOptions, RtcJoinResult, RtcUserJoinedEvent, RtcUserLeftEvent, RtcStateChangeEvent, } from './types';
export type { Subscription };
export declare function isRtcAvailable(): boolean;
export declare function getRtcServiceStatus(): RtcServiceStatus;
export declare function getRtcSdkVersion(): string | null;
export declare function initRtcEngine(options?: RtcInitOptions): Promise<void>;
export declare function joinChannel(options: RtcJoinOptions): Promise<import("./types").RtcJoinResult>;
export declare function leaveChannel(): Promise<void>;
export declare function muteLocalAudio(muted: boolean): Promise<void>;
export declare function setAudioOutputVolume(volume: RtcVolume): Promise<void>;
export declare function addUserJoinedListener(listener: (event: RtcUserJoinedEvent) => void): Subscription;
export declare function addUserLeftListener(listener: (event: RtcUserLeftEvent) => void): Subscription;
export declare function addRtcStateChangeListener(listener: (event: RtcStateChangeEvent) => void): Subscription;
//# sourceMappingURL=index.d.ts.map