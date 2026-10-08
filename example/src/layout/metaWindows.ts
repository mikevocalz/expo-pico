import { isHorizonBuild } from '../platform';
import { createMetaWindows, type MetaLayoutModules } from './metaWindowsCore';

/**
 * The app's Meta VR Layout SDK facade. Live in the quest flavor only; on PICO,
 * phone, iOS and web the requires below never run and every window renders
 * inline. See `metaWindowsCore.ts`.
 */
export const metaWindows = createMetaWindows(isHorizonBuild, () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const layout = require('@metavr/layout-compat');
  const window = require('@metavr/layout-window-compat');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    layout: {
      SpatialSceneProvider: layout.SpatialSceneProvider,
      useSpatialScene: layout.useSpatialScene,
    },
    window: {
      SpatialWindow: window.SpatialWindow,
      createWindowScene: window.createWindowScene,
      useSpatialWindowState: window.useSpatialWindowState,
    },
  } as MetaLayoutModules;
});
