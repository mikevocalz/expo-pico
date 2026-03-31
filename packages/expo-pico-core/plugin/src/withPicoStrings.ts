import { ConfigPlugin, withStringsXml } from '@expo/config-plugins';
import type { ResourceXML } from '@expo/config-plugins/build/android/Resources';

import type { ResolvedPicoOptions } from './types';

/**
 * Injects PICO-related string resources into strings.xml.
 *
 * Uses withStringsXml — the safe, structured mod for Android string resources.
 * All mutations are idempotent: existing entries are updated in place,
 * new entries are appended.
 *
 * Currently injects:
 *   - pico_app_id: The PICO platform app ID (used by native code)
 *   - pico_spatial_mode: The configured spatial mode string
 */
export const withPicoStrings: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  return withStringsXml(config, (config) => {
    const strings = config.modResults;

    upsertStringResource(strings, 'pico_app_id', options.picoAppId);
    upsertStringResource(strings, 'pico_spatial_mode', options.spatialMode);

    return config;
  });
};

/**
 * Adds or updates a string resource entry. Idempotent.
 */
function upsertStringResource(strings: ResourceXML, name: string, value: string): void {
  const resources = strings.resources as { string?: any[] };
  if (!resources.string) {
    resources.string = [];
  }

  const existing = resources.string.find((s: any) => s.$?.name === name);

  if (existing) {
    existing._ = value;
  } else {
    resources.string.push({
      $: { name, translatable: 'false' },
      _: value,
    });
  }
}

export default withPicoStrings;
