import { ConfigPlugin } from '@expo/config-plugins';
import type { PicoSpatialPluginOptions } from './types';
/**
 * Config plugin for expo-pico-spatial.
 *
 * Adds spatial-specific manifest declarations (pico flavor only when the
 * app has one). Relies on expo-pico-core
 * being listed first in the plugins array (for flavor/repo injection).
 *
 * This plugin does NOT re-inject flavors or repos — core owns those.
 */
declare const withPicoSpatial: ConfigPlugin<PicoSpatialPluginOptions | void>;
export default withPicoSpatial;
//# sourceMappingURL=withPicoSpatial.d.ts.map