import { ConfigPlugin } from '@expo/config-plugins';
/**
 * Fails the prebuild when an activity's `pico.vr.position` would reuse
 * another activity's PICO OS 5 window or make it a popup, and has
 * app/build.gradle apply the Gradle check that reads each variant's merged
 * manifest, library manifests included.
 *
 * Register it before the other mods: Expo runs the most recently registered
 * mod of each type first, so this one sees what the others wrote.
 */
export declare const withPicoWindowPositions: ConfigPlugin;
export default withPicoWindowPositions;
//# sourceMappingURL=withPicoWindowPositions.d.ts.map