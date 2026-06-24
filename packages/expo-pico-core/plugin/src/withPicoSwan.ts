import {
  ConfigPlugin,
  withAppBuildGradle,
  withDangerousMod,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedPicoOptions } from './types';

const SWAN_DEP_MARKER = '// expo-pico-core: swan dependencies';
const SWAN_DEP_END = '// expo-pico-core: end swan dependencies';

/**
 * Composite plugin that applies all Swan-only mutations:
 *
 *   1. Optionally injects a Swan SDK Maven artifact and/or a Swan runtime
 *      Gradle subproject implementation into `app/build.gradle`. Both are
 *      idempotent (marker-guarded) and replaced in place when toggled.
 *   2. Optionally scaffolds a `picoSwan` Kotlin source set with a single
 *      `PicoSwanBootstrap.kt` extension seam, useful for app-level Swan-
 *      only initialization without polluting the shared `pico` flavor.
 *
 * No-op when `xrMode !== 'pico-swan'`. The Swan composite intentionally
 * does NOT touch:
 *   - MainApplication (handled by withPicoMainApplication for both
 *     'pico-os5' and 'pico-swan'),
 *   - settings.gradle (handled by withPicoSettingsGradle),
 *   - Manifest meta-data (handled by withPicoAndroidManifest, which reads
 *     options.xrMode and options.picoSwan to decide what to write).
 *
 * This separation keeps each concern in a single place and makes it easy
 * to delete Swan support later without unwinding cross-cutting hooks.
 */
export const withPicoSwan: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  if (options.xrMode !== 'pico-swan') return config;

  config = withSwanAppBuildGradle(config, options);

  if (options.picoSwan.scaffoldSwanSourceSet) {
    config = withSwanSourceSet(config, options);
  }

  return config;
};

const withSwanAppBuildGradle: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  return withAppBuildGradle(config, (config) => {
    config.modResults.contents = applySwanGradleTransform(
      config.modResults.contents,
      options
    );
    return config;
  });
};

/**
 * Pure transform that writes Swan-only Gradle dependency block into
 * `app/build.gradle`. Exposed for unit testing.
 *
 * Always re-emits the block on each run so toggling swanSdkArtifact /
 * swanRuntimeProject between prebuilds doesn't accumulate stale lines.
 * Returns the source unchanged when there is no Swan content to write.
 */
export function applySwanGradleTransform(
  source: string,
  options: ResolvedPicoOptions
): string {
  if (options.xrMode !== 'pico-swan') return source;

  // Strip any prior block we wrote (begin/end markers wrap the entire
  // `dependencies { … }` snippet so a single substring slice is enough).
  let contents = stripMarkedBlock(source);

  const innerLines: string[] = [];
  if (options.picoSwan.swanRuntimeProject) {
    innerLines.push(
      `    implementation project(':${options.picoSwan.swanRuntimeProject.name}')`
    );
  }
  if (options.picoSwan.swanSdkArtifact) {
    innerLines.push(`    implementation '${options.picoSwan.swanSdkArtifact}'`);
  }

  if (innerLines.length === 0) {
    return contents;
  }

  const block = [
    SWAN_DEP_MARKER,
    'dependencies {',
    ...innerLines,
    '}',
    SWAN_DEP_END,
  ].join('\n');

  return contents.trimEnd() + '\n\n' + block + '\n';
}

function stripMarkedBlock(source: string): string {
  const startIdx = source.indexOf(SWAN_DEP_MARKER);
  if (startIdx === -1) return source;
  const endIdx = source.indexOf(SWAN_DEP_END, startIdx);
  if (endIdx === -1) return source;
  const before = source.slice(0, startIdx).trimEnd();
  const after = source.slice(endIdx + SWAN_DEP_END.length).trimStart();
  if (after.length === 0) return before + '\n';
  return before + '\n\n' + after;
}

/**
 * Writes a minimal Kotlin source set under `android/app/src/picoSwan/` so the
 * consuming app has a clean place to add Swan-only Kotlin. This requires the
 * app-level `productFlavors` block to declare a `picoSwan` flavor too — when
 * absent, Gradle silently ignores the source set (no build error). The plugin
 * does not auto-add the flavor because doing so would conflict with the
 * existing `mobile`/`pico` flavor split owned by withPicoAppBuildGradle.
 *
 * The seam is intentionally minimal: a single `object PicoSwanBootstrap`
 * with a no-op `init()` that the app can call from MainApplication after
 * the PicoCorePackage is registered.
 */
const withSwanSourceSet: ConfigPlugin<ResolvedPicoOptions> = (config, _options) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const dir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'picoSwan',
        'java',
        'expo',
        'modules',
        'pico',
        'swan'
      );
      const file = path.join(dir, 'PicoSwanBootstrap.kt');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, SWAN_BOOTSTRAP_KT, 'utf8');
      }
      return config;
    },
  ]);
};

const SWAN_BOOTSTRAP_KT = `package expo.modules.pico.swan

import android.content.Context
import android.util.Log

/**
 * App-level Swan bootstrap seam.
 *
 * Generated by expo-pico-core's withPicoSwan plugin when
 * \`picoSwan.scaffoldSwanSourceSet === true\`. Replace the body of [init]
 * with calls into your Swan SDK bindings when they are available. Until
 * then this file documents the expected entry point.
 *
 * Suggested call site: from MainApplication.onCreate(), AFTER super.onCreate().
 */
object PicoSwanBootstrap {
    private const val TAG = "PicoSwanBootstrap"
    @Volatile private var initialized = false

    fun init(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            Log.i(TAG, "PICO Swan bootstrap seam reached.")
            // Extension seam: register Swan-specific runtime providers here.
            initialized = true
        }
    }
}
`;

export default withPicoSwan;
