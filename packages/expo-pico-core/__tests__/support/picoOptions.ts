import { resolveOptions as resolveCoreOptions } from '../../plugin/src/types';
import type { PicoPluginOptions } from '../../plugin/src/types';

/**
 * resolveOptions for a PICO build with an app ID set, unless a test overrides
 * it. The pico flavor builds either way (see isPicoEnabled); the ID feeds
 * Platform Service options and the BuildConfig fields.
 */
export function resolveOptions(options: PicoPluginOptions = {}) {
  return resolveCoreOptions({ picoAppId: 'TEST', ...options });
}
