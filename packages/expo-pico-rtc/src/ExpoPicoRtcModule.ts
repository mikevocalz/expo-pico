import { NativeModule } from 'expo';
import { resolveNativeModule } from '@expo-pico/platform-service-common';

declare class ExpoPicoRtcNativeModule extends NativeModule {
  readonly rtcSdkAvailable: boolean;
  readonly rtcSdkVersion: string | null;

  initRtcEngine(options: Record<string, unknown>): Promise<void>;
  joinChannel(channelId: string, token: string, uid: number): Promise<Record<string, unknown>>;
  leaveChannel(): Promise<void>;
  muteLocalAudio(muted: boolean): Promise<void>;
  setAudioOutputVolume(volume: number): Promise<void>;
}

const { available, nativeModule } = resolveNativeModule<ExpoPicoRtcNativeModule>('ExpoPicoRtc');

export const NativeRtc = available ? nativeModule : null;
export const rtcNativeAvailable = available;
export default NativeRtc;
