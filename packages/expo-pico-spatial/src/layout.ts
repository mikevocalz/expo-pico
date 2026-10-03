export type PicoSpatialLayoutRole =
  | 'master'
  | 'content'
  | 'inspector'
  | 'accessory'
  | 'popup'
  | 'volume'
  | 'immersive';

export type PicoSpatialLayoutPlacement = 'start' | 'center' | 'end' | 'top' | 'bottom' | 'user';

export type PicoSpatialLayoutPrimitive =
  | 'window-container-planar'
  | 'window-container-volume'
  | 'subwindow-start'
  | 'subwindow-end'
  | 'augment'
  | 'toolbar'
  | 'spatial-popup'
  | 'attachment-panel'
  | 'stage'
  | 'inline';

export interface PicoSpatialLayoutReadiness {
  modernSpatialUiRuntimePresent: boolean;
  legacySpatialRuntimePresent: boolean;
  attachmentPanelRuntimePresent: boolean;
  spatialNavigatorRuntimePresent: boolean;
  /**
   * False until expo-pico owns concrete bindings for PICO Spatial SDK 6.x
   * WindowContainer/Subwindow/Augment/Toolbar/Popup/Stage operations.
   */
  nativeLayoutBridgeBound: boolean;
}

export function resolvePicoLayoutPrimitive(
  role: PicoSpatialLayoutRole,
  placement: PicoSpatialLayoutPlacement = 'center'
): PicoSpatialLayoutPrimitive {
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

export function layoutReadinessFromProbe(
  probe: Record<string, boolean>
): PicoSpatialLayoutReadiness {
  return {
    modernSpatialUiRuntimePresent: probe.spatialUiScope === true,
    legacySpatialRuntimePresent: probe.legacySpatialAnchors === true,
    attachmentPanelRuntimePresent: probe.attachmentPanel === true,
    spatialNavigatorRuntimePresent: probe.spatialNavigator === true,
    nativeLayoutBridgeBound: false,
  };
}
