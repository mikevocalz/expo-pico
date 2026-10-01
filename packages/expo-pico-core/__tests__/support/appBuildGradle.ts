import { resolveOptions } from '../../plugin/src/types';
import type { PicoPluginOptions } from '../../plugin/src/types';
import { withPicoAppBuildGradle } from '../../plugin/src/withPicoGradle';

/**
 * Drive the real `appBuildGradle` mod against an in-memory build.gradle.
 *
 * `withAppBuildGradle` only parks the callback on `config.mods.android`, so
 * the mod can be invoked directly without the rest of the
 * @expo/config-plugins pipeline — the same trick `picoViroIntegration`
 * uses for `withProjectBuildGradle`.
 */
type AppMod = (config: unknown) => Promise<{ modResults: { contents: string } }>;

/** A stripped-down `android/app/build.gradle` as `expo prebuild` emits it. */
export const BARE_APP_GRADLE = `apply plugin: "com.android.application"
apply plugin: "com.facebook.react"

react {
    reactNativeDir = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsoluteFile()
}

android {
    namespace "com.example.app"
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.example.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
    }
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

export async function renderAppGradle(
  options: Partial<PicoPluginOptions>,
  contents: string = BARE_APP_GRADLE
): Promise<string> {
  const config = withPicoAppBuildGradle(
    { name: 'pico', slug: 'pico' } as never,
    resolveOptions(options) as never
  ) as unknown as { mods: { android: { appBuildGradle: AppMod } } };
  const applied = await config.mods.android.appBuildGradle({
    modRequest: { projectRoot: process.cwd(), nextMod: (result: unknown) => result },
    modResults: { contents, language: 'groovy' },
  });
  return applied.modResults.contents;
}
