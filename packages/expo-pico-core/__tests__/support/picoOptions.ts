import { resolveOptions as resolveCoreOptions } from '../../plugin/src/types';
import type { PicoPluginOptions } from '../../plugin/src/types';

/**
 * resolveOptions for a PICO build: the app ID is set unless a test overrides
 * it. Without one, core builds no pico flavor (see isPicoEnabled).
 */
export function resolveOptions(options: PicoPluginOptions = {}) {
  return resolveCoreOptions({ picoAppId: 'TEST', ...options });
}
