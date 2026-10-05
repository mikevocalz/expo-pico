export type PicoSpatialLayoutRole = 'master' | 'content' | 'inspector' | 'accessory' | 'popup' | 'volume' | 'immersive';
export type PicoSpatialLayoutPlacement = 'start' | 'center' | 'end' | 'top' | 'bottom' | 'user';
export type PicoSpatialLayoutPrimitive = 'window-container-planar' | 'window-container-volume' | 'subwindow-start' | 'subwindow-end' | 'augment' | 'toolbar' | 'spatial-popup' | 'attachment-panel' | 'stage' | 'inline';
/**
 * What the native WindowContainer bridge reports about itself.
 *
 * `sdkLinked` only says the PICO Spatial SDK classes are in the APK. Linking
 * them does not make a PICO OS 5 headset or a phone spatial, so `spatialPlatform`
 * comes from `SpatialBuild.isSpatialPlatform()` at runtime.
 */
export interface PicoSpatialLayoutBridgeStatus {
    sdkLinked: boolean;
    spatialPlatform: boolean;
    /** Why the bridge can't run, or null when it can. */
    reason: string | null;
    /** Message from the most recent SDK call that threw, if any. */
    lastError: string | null;
}
export interface PicoSpatialLayoutReadiness {
    /**
     * The `*RuntimePresent` flags need both the class in the APK and
     * `spatialPlatform`. Class presence alone would read true on PICO OS 5
     * as soon as the SDK is linked.
     */
    modernSpatialUiRuntimePresent: boolean;
    legacySpatialRuntimePresent: boolean;
    attachmentPanelRuntimePresent: boolean;
    spatialNavigatorRuntimePresent: boolean;
    /** `SpatialBuild.isSpatialPlatform()` returned true on this device. */
    spatialPlatform: boolean;
    /**
     * True when the WindowContainer open/close bridge is compiled in, the SDK is
     * linked, and the device is a spatial platform. Subwindow, Augment, Toolbar,
     * SpatialPopup and Stage are still unbound even when this is true.
     */
    nativeLayoutBridgeBound: boolean;
    /** Native-side reason the bridge cannot run, or null when it can. */
    bridgeReason: string | null;
}
export declare function resolvePicoLayoutPrimitive(role: PicoSpatialLayoutRole, placement?: PicoSpatialLayoutPlacement): PicoSpatialLayoutPrimitive;
/**
 * @param probe class-presence map from `getSpatialSdkProbe()`
 * @param bridge native bridge status; omit or pass null when the native module
 *   is missing or predates `getLayoutBridgeStatus`, which reads as unbound
 */
export declare function layoutReadinessFromProbe(probe: Record<string, boolean>, bridge?: PicoSpatialLayoutBridgeStatus | null): PicoSpatialLayoutReadiness;
//# sourceMappingURL=layout.d.ts.map