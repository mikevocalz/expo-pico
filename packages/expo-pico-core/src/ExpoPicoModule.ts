import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoPicoModule extends NativeModule {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: string;
  targetProfile: string;
  containerMode: string;
  picoAppId: string | null;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
}

export default requireNativeModule<ExpoPicoModule>('ExpoPico');
