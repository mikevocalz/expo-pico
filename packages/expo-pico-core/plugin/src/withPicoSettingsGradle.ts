import {
  ConfigPlugin,
  withSettingsGradle,
} from '@expo/config-plugins';
// withFinalizedMod runs AFTER all other mods. Imported via the deep path
// because some older @expo/config-plugins releases don't re-export it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod as (
  config: unknown,
  args: [
    'android' | 'ios',
    (cfg: { modRequest: { platformProjectRoot: string } }) => unknown,
  ]
) => unknown;
import * as fs from 'fs';
import * as path from 'path';

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
  const needsSwan =
    options.xrMode === 'pico-swan' && !!options.picoSwan.swanRuntimeProject;
  // Viro path rewrite always applies on PICO/Quest because bun/pnpm hoist
  // `@reactvision/react-viro` out of `example/node_modules`, breaking the
  // `../node_modules/...` relative paths that Viro's plugin writes.
  const needsViroPathRewrite = options.xrMode !== 'mobile';
  if (!needsSwan && !needsViroPathRewrite) return config;

  // Run the Swan-subproject transform through withSettingsGradle (mod order
  // doesn't matter for that — we're appending, not rewriting Viro's lines).
  if (needsSwan) {
    config = withSettingsGradle(config, (config) => {
      config.modResults.contents = applySettingsGradleTransform(
        config.modResults.contents,
        options
      );
      return config;
    });
  }

  // The Viro-path rewrite has to run AFTER Viro's plugin appends its
  // `project(':...').projectDir = new File('../node_modules/...')` lines. Mods
  // run LIFO (last-registered first), so a regular `withSettingsGradle`
  // callback registered here runs BEFORE Viro's because we're registered
  // later in the plugins array. `withDangerousMod` runs at the end of the
  // entire mod pipeline, after every withSettingsGradle has flushed.
  // The Viro path rewrite is done as a same-phase withSettingsGradle mod.
  // Registration order in the settings phase = run order. Because
  // `@expo-pico/core` is listed AFTER `@reactvision/react-viro` in
  // `app.config.ts`, this mod is registered LAST in the settings phase
  // chain and sees Viro's appended `project(':...').projectDir = ...` lines
  // in `config.modResults.contents`.
  // Viro path rewrite runs in `finalized` mod phase — AFTER all
  // withSettingsGradle mods have completed and flushed to disk. We re-read
  // the file with fs because the modResults model isn't populated for the
  // finalized phase. Idempotent via `applyViroPathRewrite`'s marker check.
  if (needsViroPathRewrite) {
    config = withFinalizedMod(config, [
      'android',
      (cfg) => {
        const settingsPath = path.join(
          cfg.modRequest.platformProjectRoot,
          'settings.gradle'
        );
        if (!fs.existsSync(settingsPath)) return cfg;
        const before = fs.readFileSync(settingsPath, 'utf8');
        const after = applyViroPathRewrite(before);
        if (after !== before) {
          fs.writeFileSync(settingsPath, after, 'utf8');
        }
        return cfg;
      },
    ]) as typeof config;
  }

  return config;
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

/**
 * Rewrite Viro's relative `node_modules` paths in settings.gradle to resolve
 * through `node --print require.resolve(...)` so they work regardless of
 * which workspace level the package manager hoists `@reactvision/react-viro`
 * to. The Viro plugin writes:
 *
 *   project(':viro_renderer').projectDir =
 *     new File('../node_modules/@reactvision/react-viro/android/viro_renderer')
 *
 * Bun's monorepo hoister puts Viro at the workspace root, so the relative
 * `../node_modules/...` from `example/android/settings.gradle` resolves to
 * `example/node_modules/...` which is empty. Idempotent — the rewrite is
 * marker-guarded by replacing the literal `new File('../node_modules/...')`
 * pattern only.
 */
const VIRO_PATH_MARKER = '// expo-pico-core: viro path via node-resolve';

export function applyViroPathRewrite(source: string): string {
  if (source.includes(VIRO_PATH_MARKER)) return source;

  const viroRelativePattern =
    /project\(':(react_viro|arcore_client|gvr_common|viro_renderer)'\)\.projectDir\s*=\s*new File\('[^']*node_modules\/@reactvision\/react-viro\/android\/[^']+'\)/g;
  if (!viroRelativePattern.test(source)) return source;
  viroRelativePattern.lastIndex = 0;

  const viroAndroidDirBlock = `
${VIRO_PATH_MARKER}
def viroAndroidDir = new File(
    providers.exec {
        workingDir(rootDir)
        commandLine("node", "--print", "require('path').dirname(require.resolve('@reactvision/react-viro/package.json')) + '/android'")
    }.standardOutput.asText.get().trim()
)
`;

  let contents = source.replace(
    viroRelativePattern,
    (_, projectName: string) => {
      const subdir = projectName;
      return `project(':${projectName}').projectDir = new File(viroAndroidDir, '${subdir}')`;
    }
  );

  // Inject the viroAndroidDir definition BEFORE the first
  // `project(':<viroSubproject>').projectDir = ...` line so all uses see
  // the variable. Viro emits four such lines (arcore_client, gvr_common,
  // viro_renderer, react_viro) in order; we anchor at whichever comes first.
  const anchorRegex =
    /project\(':(?:react_viro|arcore_client|gvr_common|viro_renderer)'\)\.projectDir\s*=\s*new File\(viroAndroidDir/;
  const anchorMatch = contents.match(anchorRegex);
  if (anchorMatch && anchorMatch.index !== undefined) {
    contents =
      contents.slice(0, anchorMatch.index) +
      viroAndroidDirBlock +
      '\n' +
      contents.slice(anchorMatch.index);
  } else {
    // Fallback — append at end if no use site found.
    contents = contents.trimEnd() + '\n' + viroAndroidDirBlock + '\n';
  }
  return contents;
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
