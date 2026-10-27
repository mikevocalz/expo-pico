import { ConfigPlugin, withAppBuildGradle, withFinalizedMod } from '@expo/config-plugins';
import * as path from 'path';

import {
  applyOneLauncherTileGradle,
  assertOneLauncherTileOnDisk,
  resolveOneLauncherTileScript,
} from './launcherTiles';

/**
 * Keeps the app at one headset library tile. The prebuild fails when the
 * main manifest, alone or with any flavor manifest (the PICO overlay
 * included), has more than one launcher-visible activity, and
 * app/build.gradle applies the Gradle check that reads each variant's merged
 * manifest, library manifests included.
 *
 * Register it before the other mods: Expo runs the most recently registered
 * mod of each type first, so this one sees what the others wrote.
 */
export const withPicoOneLauncherTile: ConfigPlugin = (config) => {
  config = withAppBuildGradle(config, (config) => {
    const appModuleDir = path.join(config.modRequest.platformProjectRoot, 'app');
    config.modResults.contents = applyOneLauncherTileGradle(
      config.modResults.contents,
      resolveOneLauncherTileScript(config.modRequest.projectRoot, appModuleDir)
    );
    return config;
  });
  return withFinalizedMod(config, [
    'android',
    async (config) => {
      await assertOneLauncherTileOnDisk(config.modRequest.platformProjectRoot);
      return config;
    },
  ]);
};

export default withPicoOneLauncherTile;
