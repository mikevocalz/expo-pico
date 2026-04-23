import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoPicoModule extends NativeModule {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: string;
  targetProfile: string;
  containerMode: string;
  xrMode: string;
  appType: string;
  picoAppId: string | null;
  picoAppKey: string | null;
  hasPlatformIdentity: boolean;
  hasIapIdentity: boolean;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os6RuntimeInitialized: boolean;

  // Phase J — reflection-based PICO Platform SDK detection.
  platformSdkPresent: boolean;
  platformSdkVersion: string | null;

  // Phase F — async runtime introspection.
  hasSystemFeature(name: string): Promise<boolean>;
  getDeclaredFeatures(): Promise<Array<{ name: string; required: boolean; glEsVersion?: string }>>;
  getDeclaredPermissions(): Promise<Array<{ name: string; granted: boolean }>>;

  // Phase J — per-surface SDK probe report.
  getPlatformSdkProbe(): Promise<Record<string, boolean>>;
}

export default requireNativeModule<ExpoPicoModule>('ExpoPico');
