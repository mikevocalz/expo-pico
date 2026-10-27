import { ConfigPlugin, withAppBuildGradle, withFinalizedMod } from '@expo/config-plugins';
import * as path from 'path';

import { applyMarkedGradleScript, resolveCoreGradleScript } from './launcherTiles';
import { assertWindowPositionsOnDisk } from './picoWindows';

const GRADLE_MARKER = '// @expo-pico/core: PICO window position check';
const SCRIPT = 'pico-window-positions.gradle';

/**
 * Fails the prebuild when an activity's `pico.vr.position` would reuse
 * another activity's PICO OS 5 window or make it a popup, and has
 * app/build.gradle apply the Gradle check that reads each variant's merged
 * manifest, library manifests included.
 *
 * Register it before the other mods: Expo runs the most recently registered
 * mod of each type first, so this one sees what the others wrote.
 */
export const withPicoWindowPositions: ConfigPlugin = (config) => {
  config = withAppBuildGradle(config, (config) => {
    const appModuleDir = path.join(config.modRequest.platformProjectRoot, 'app');
    config.modResults.contents = applyMarkedGradleScript(
      config.modResults.contents,
      GRADLE_MARKER,
      SCRIPT,
      resolveCoreGradleScript(config.modRequest.projectRoot, appModuleDir, SCRIPT)
    );
    return config;
  });
  return withFinalizedMod(config, [
    'android',
    async (config) => {
      await assertWindowPositionsOnDisk(config.modRequest.platformProjectRoot);
      return config;
    },
  ]);
};

export default withPicoWindowPositions;
