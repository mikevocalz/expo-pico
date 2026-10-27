import { AndroidConfig } from '@expo/config-plugins';
/**
 * One launcher tile per app.
 *
 * PICO OS and Horizon OS list every activity whose intent-filter pairs
 * `android.intent.action.MAIN` with one of LAUNCHER_VISIBLE_CATEGORIES. This
 * plugin used to give Viro's `.VRActivity` MAIN plus the PICO/OpenXR
 * categories, so a PICO 4 Ultra showed the app twice. VRActivity is started
 * by an explicit intent and PICO runs it immersive with no intent-filter at
 * all (checked on a PICO 4 Ultra, OS 5.15.7), so it needs none.
 *
 * The rule: exactly one activity in an app may be launcher-visible.
 */
export declare const MAIN_ACTION = "android.intent.action.MAIN";
/** Categories that put a MAIN activity in a phone or headset app library. */
export declare const LAUNCHER_VISIBLE_CATEGORIES: readonly string[];
type Node = {
    $?: Record<string, string | undefined>;
    [key: string]: any;
};
type Manifest = AndroidConfig.Manifest.AndroidManifest;
/** True when `filter` lists MAIN and at least one launcher-visible category. */
export declare function isLauncherVisibleFilter(filter: Node): boolean;
/**
 * Launcher-visible activity names for the main manifest merged with one
 * flavor manifest. Approximates the manifest merger: an activity counts when
 * either file gives it a launcher-visible filter, unless the flavor removes
 * the activity, replaces it, or drops its filters with
 * `<intent-filter tools:node="removeAll"/>`.
 */
export declare function launcherVisibleActivities(main: Manifest, flavor?: Manifest): string[];
export declare function launcherTileError(where: string, names: string[]): Error;
/** Throws when `main` (optionally merged with `flavor`) has more than one tile. */
export declare function assertAtMostOneLauncherTile(where: string, main: Manifest, flavor?: Manifest): void;
/** The action Viro's immersive activity answers to once it no longer uses MAIN. */
export declare const VIRO_VR_ACTION = "com.viro.intent.action.VR";
/**
 * Gives `.VRActivity` `com.viro.intent.action.VR` in place of MAIN in every
 * launcher-visible intent-filter, keeping its categories. Every published
 * @reactvision/react-viro (2.58 to 3.0.x) writes MAIN plus
 * com.oculus.intent.category.VR there, which makes the activity a second
 * library tile. Viro starts it by explicit intent, so MAIN is never used.
 * Returns true when the manifest changed.
 */
export declare function moveVRActivityOffMain(manifest: Manifest): boolean;
/** Applies {@link moveVRActivityOffMain} to app/src/main/AndroidManifest.xml on disk. */
export declare function moveVRActivityOffMainOnDisk(platformProjectRoot: string): Promise<void>;
/**
 * Reads app/src/main and every app/src/<flavor> manifest on disk and throws
 * when main alone, or main plus any one flavor, has more than one
 * launcher-visible activity. Library manifests are checked by the Gradle
 * task in android/one-launcher-tile.gradle, which reads the merged result.
 */
export declare function assertOneLauncherTileOnDisk(platformProjectRoot: string): Promise<void>;
/**
 * Returns app/build.gradle with exactly one `apply from: "<scriptPath>"`
 * line under `marker` at the end, dropping any earlier copy of that pair.
 * Idempotent; a changed path replaces the old one.
 */
export declare function applyMarkedGradleScript(contents: string, marker: string, scriptFile: string, scriptPath: string): string;
/**
 * Returns app/build.gradle with exactly one `apply from:` line for
 * android/one-launcher-tile.gradle at the end. `scriptPath` is relative to
 * the app module directory. Idempotent.
 */
export declare function applyOneLauncherTileGradle(contents: string, scriptPath: string): string;
/**
 * Path of a script in this package's android/ directory relative to the app
 * module directory, with POSIX separators for Gradle.
 */
export declare function resolveCoreGradleScript(projectRoot: string, appModuleDir: string, fileName: string): string;
/** {@link resolveCoreGradleScript} for android/one-launcher-tile.gradle. */
export declare function resolveOneLauncherTileScript(projectRoot: string, appModuleDir: string): string;
export {};
//# sourceMappingURL=launcherTiles.d.ts.map