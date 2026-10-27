import { ConfigPlugin } from '@expo/config-plugins';
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
export declare const withPicoOneLauncherTile: ConfigPlugin;
export default withPicoOneLauncherTile;
//# sourceMappingURL=withPicoOneLauncherTile.d.ts.map