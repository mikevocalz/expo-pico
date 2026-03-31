import { ConfigPlugin, withGradleProperties } from '@expo/config-plugins';
import type { PropertiesItem } from '@expo/config-plugins/build/android/Properties';

import type { ResolvedPicoOptions } from './types';
import { resolveTargetProfile } from './types';

/**
 * Injects PICO-related properties into gradle.properties.
 *
 * Uses withGradleProperties — the safe, structured mod for gradle.properties.
 * Properties are appended; duplicates are avoided by checking existing entries.
 *
 * Properties injected:
 *   - picoAppId: Read by the library's android/build.gradle to set BuildConfig fields
 *   - picoSpatialMode: Available to native code via gradle property
 *   - picoTargetProfile / picoContainerMode / picoEmulatorOptimizations:
 *     keep the library BuildConfig aligned with the app BuildConfig fields
 *   - picoBuildEnabled: Signals to sibling packages that PICO build infra is active
 */
export const withPicoGradleProperties: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const effectiveProfile = resolveTargetProfile(options);

    upsertProperty(props, 'picoAppId', options.picoAppId);
    upsertProperty(props, 'picoSpatialMode', options.spatialMode);
    upsertProperty(props, 'picoTargetProfile', effectiveProfile);
    upsertProperty(props, 'picoContainerMode', options.defaultContainerMode);
    upsertProperty(props, 'picoEmulatorOptimizations', String(options.enableEmulatorOptimizations));
    upsertProperty(props, 'picoBuildEnabled', 'true');

    return config;
  });
};

/**
 * Adds or updates a property in the gradle.properties array. Idempotent.
 */
function upsertProperty(props: PropertiesItem[], key: string, value: string): void {
  const existing = props.find((p) => p.type === 'property' && 'key' in p && p.key === key);
  if (existing && existing.type === 'property') {
    existing.value = value;
  } else {
    props.push({ type: 'property', key, value });
  }
}

export default withPicoGradleProperties;
