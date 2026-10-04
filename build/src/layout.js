"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePicoLayoutPrimitive = resolvePicoLayoutPrimitive;
exports.layoutReadinessFromProbe = layoutReadinessFromProbe;
function resolvePicoLayoutPrimitive(role, placement = 'center') {
    switch (role) {
        case 'content':
            return 'window-container-planar';
        case 'master':
            return placement === 'end' ? 'subwindow-end' : 'subwindow-start';
        case 'inspector':
            return placement === 'start' ? 'subwindow-start' : 'subwindow-end';
        case 'accessory':
            return 'toolbar';
        case 'popup':
            return 'spatial-popup';
        case 'volume':
            return 'window-container-volume';
        case 'immersive':
            return 'stage';
    }
}
/**
 * @param probe class-presence map from `getSpatialSdkProbe()`
 * @param bridge native bridge status; omit or pass null when the native module
 *   is missing or predates `getLayoutBridgeStatus`, which reads as unbound
 */
function layoutReadinessFromProbe(probe, bridge) {
    const spatialPlatform = bridge?.spatialPlatform === true;
    return {
        modernSpatialUiRuntimePresent: spatialPlatform && probe.spatialUiScope === true,
        legacySpatialRuntimePresent: probe.legacySpatialAnchors === true,
        attachmentPanelRuntimePresent: spatialPlatform && probe.attachmentPanel === true,
        spatialNavigatorRuntimePresent: spatialPlatform && probe.spatialNavigator === true,
        spatialPlatform,
        nativeLayoutBridgeBound: spatialPlatform && bridge?.sdkLinked === true,
    };
}
//# sourceMappingURL=layout.js.map