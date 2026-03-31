export interface PicoSpatialPluginOptions {
  /**
   * Whether to inject spatial SDK Gradle dependency when available.
   * Set to true only when you have access to the PICO Spatial SDK AAR.
   * @default false
   */
  enableSpatialSdk?: boolean;
  /**
   * Whether to declare spatial anchor capability in the manifest.
   * @default false
   */
  anchorPersistence?: boolean;
  /**
   * Whether to declare scene mesh capability in the manifest.
   * @default false
   */
  sceneMeshEnabled?: boolean;
  /**
   * PICO Spatial Tools SDK version injected into buildscript.ext.
   * @default '2.1.0'
   */
  spatialToolsVersion?: string;
}

export interface ResolvedPicoSpatialOptions {
  enableSpatialSdk: boolean;
  anchorPersistence: boolean;
  sceneMeshEnabled: boolean;
  spatialToolsVersion: string;
}

export const SPATIAL_DEFAULTS: ResolvedPicoSpatialOptions = {
  enableSpatialSdk: false,
  anchorPersistence: false,
  sceneMeshEnabled: false,
  spatialToolsVersion: '2.1.0',
};

export function resolveSpatialOptions(
  options: PicoSpatialPluginOptions = {}
): ResolvedPicoSpatialOptions {
  return { ...SPATIAL_DEFAULTS, ...options };
}
