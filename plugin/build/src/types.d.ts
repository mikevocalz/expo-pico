export interface PicoSpatialPluginOptions {
    /**
     * Adds `com.pico.spatial.core:core:6.1.9` (PICO Spatial SDK 6, public on the
     * Volcengine Maven) to the pico and dual flavors so openWindowContainer and
     * closeWindowContainer can run on PICO OS 6. On PICO OS 5 they still return
     * false. Linking the SDK also marks the app as spatial on OS 6.
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
export declare const SPATIAL_DEFAULTS: ResolvedPicoSpatialOptions;
export declare function resolveSpatialOptions(options?: PicoSpatialPluginOptions): ResolvedPicoSpatialOptions;
//# sourceMappingURL=types.d.ts.map