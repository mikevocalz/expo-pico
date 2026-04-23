import { ConfigPlugin, withSettingsGradle } from '@expo/config-plugins';

import { PICO_SETTINGS_MARKER } from './constants';
import type { ResolvedPicoOptions } from './types';

/**
 * Optionally injects PICO Swan runtime subproject inclusion into
 * `android/settings.gradle`.
 *
 * Mirrors the role of Viro's `withViroSettingsGradle` (which appends
 * `include ':react_viro', ':arcore_client', ':gvr_common', ':viro_renderer'`
 * unconditionally). Two changes:
 *
 *   1. **Idempotent.** Marker-guarded; re-running prebuild does not produce
 *      duplicate `include` lines (Viro's helper does — that's a known bug
 *      we explicitly correct here).
 *   2. **Opt-in, not unconditional.** PICO Swan SDK is not a vendored set of
 *      Gradle subprojects shipped inside this package. Inclusion only
 *      happens when the consumer points the plugin at a Swan runtime
 *      subproject path via `picoSwan.swanRuntimeProject`. This is the
 *      extension seam for when public PICO Swan native libraries ship as
 *      Gradle modules.
 *
 * No-ops when:
 *   - `xrMode !== 'pico-swan'`, OR
 *   - `picoSwan.swanRuntimeProject` is unset.
 */
export const withPicoSettingsGradle: ConfigPlugin<ResolvedPicoOptions> = (
  config,
  options
) => {
  if (options.xrMode !== 'pico-swan') return config;
  if (!options.picoSwan.swanRuntimeProject) return config;

  return withSettingsGradle(config, (config) => {
    config.modResults.contents = applySettingsGradleTransform(
      config.modResults.contents,
      options
    );
    return config;
  });
};

/**
 * Pure string transform exposed for unit testing without spinning up the
 * full @expo/config-plugins mod pipeline. Returns the source unchanged when
 * Swan inclusion is not active.
 */
export function applySettingsGradleTransform(
  source: string,
  options: ResolvedPicoOptions
): string {
  if (options.xrMode !== 'pico-swan') return source;
  const project = options.picoSwan.swanRuntimeProject;
  if (!project) return source;

  let contents = source;
  if (contents.includes(PICO_SETTINGS_MARKER)) {
    contents = stripPicoSettingsBlock(contents);
  }
  const block = renderSettingsBlock(project.name, project.path);
  return contents.trimEnd() + '\n\n' + block + '\n';
}

function renderSettingsBlock(name: string, path: string): string {
  return [
    PICO_SETTINGS_MARKER,
    `include ':${name}'`,
    `project(':${name}').projectDir = new File(rootProject.projectDir, '${path}')`,
    `// expo-pico-core: end pico subprojects`,
  ].join('\n');
}

function stripPicoSettingsBlock(contents: string): string {
  const startIdx = contents.indexOf(PICO_SETTINGS_MARKER);
  const endMarker = '// expo-pico-core: end pico subprojects';
  const endIdx = contents.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) return contents;
  const before = contents.slice(0, startIdx).trimEnd();
  const after = contents.slice(endIdx + endMarker.length);
  return before + '\n' + after.trimStart();
}

export default withPicoSettingsGradle;
