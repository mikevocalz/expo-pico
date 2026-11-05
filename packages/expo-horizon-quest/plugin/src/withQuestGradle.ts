import { ConfigPlugin, withAppBuildGradle, withProjectBuildGradle } from '@expo/config-plugins';

import type { ResolvedQuestOptions } from './types';
import { META_LAYOUT_GRADLE_MARKER } from './withQuestMetaLayout';

const QUEST_FLAVOR_BEGIN = '// expo-horizon-quest: begin quest flavor';
const QUEST_FLAVOR_END = '// expo-horizon-quest: end quest flavor';
// Same marker text the PICO plugin uses, so a project with both gets one copy.
const SUBPROJECT_MISSING_DIM_MARKER = '// expo-pico-core: subprojects missing-dim fallback';
const HORIZON_BUILD_CONFIG_MARKER =
  '// expo-pico-core: Expo Horizon AGP 9 BuildConfig compatibility';

/**
 * The quest flavor's settings, appended to `app/build.gradle` and rewritten on
 * every prebuild.
 *
 * expo-horizon-core declares `mobile` and `quest` only when the file has no
 * flavors yet; when another plugin declared the `device` dimension first
 * (PICO), it skips. Declaring `quest` here keeps the flavor in both cases.
 * The block never mentions `flavorDimensions`, so expo-horizon-core's own
 * check still adds the dimension when nothing else did.
 *
 * Gradle creates `questImplementation` when the `quest` flavor is declared,
 * so the flavor has to come before the Meta Layout SDK block that calls it
 * (`withQuestMetaLayout`). Expo runs the two mods in reverse registration
 * order, so this places the flavor above that block whenever the block is
 * already in the file, instead of relying on which mod ran first.
 */
export function updateQuestFlavorBlock(contents: string, options: ResolvedQuestOptions): string {
  contents = contents.replace(
    new RegExp(`\\n${escape(QUEST_FLAVOR_BEGIN)}[\\s\\S]*?${escape(QUEST_FLAVOR_END)}\\n?`, 'g'),
    ''
  );
  const abi = options.ndkAbiFilters ? `\n            ndk { abiFilters 'arm64-v8a' }` : '';
  const pickFirst = options.viroRendererOverlay
    ? `
androidComponents {
    onVariants(selector().all()) { variant ->
        if (variant.productFlavors.any { it.first == "device" && it.second == "quest" }) {
            variant.packaging.jniLibs.pickFirsts.addAll(["**/libviro_renderer.so"])
        }
    }
}`
    : '';
  const block = `
${QUEST_FLAVOR_BEGIN}
android {
    productFlavors {
        quest {
            dimension "device"
            minSdkVersion 29
            matchingFallbacks = ['mobile']${abi}
        }
    }
}${pickFirst}
${QUEST_FLAVOR_END}
`;
  const metaLayout = contents.indexOf(META_LAYOUT_GRADLE_MARKER);
  if (metaLayout === -1) return contents + block;
  const lineStart = contents.lastIndexOf('\n', metaLayout - 1) + 1;
  return (
    contents.slice(0, lineStart).replace(/\n*$/, '\n') +
    block.slice(1) +
    '\n' +
    contents.slice(lineStart)
  );
}

/**
 * Project-level fixes the quest flavor needs: expo-horizon-core 57.0.2 reads
 * a BuildConfig field AGP 9 no longer generates by default, and autolinked
 * modules without the `device` dimension need a fallback to resolve flavored
 * libraries under questDebug.
 */
export function updateQuestProjectGradle(contents: string): string {
  if (!contents.includes(HORIZON_BUILD_CONFIG_MARKER)) {
    contents += `
${HORIZON_BUILD_CONFIG_MARKER}
subprojects { sub ->
    if (sub.name == "expo-horizon-core") {
        sub.plugins.withId("com.android.library") {
            sub.android.buildFeatures.buildConfig = true
        }
    }
}
`;
  }
  if (!contents.includes(SUBPROJECT_MISSING_DIM_MARKER)) {
    contents += `
${SUBPROJECT_MISSING_DIM_MARKER}
subprojects { sub ->
    sub.plugins.withId("com.android.library") {
        sub.android {
            defaultConfig {
                missingDimensionStrategy 'device', 'mobile'
            }
        }
    }
}
`;
  }
  return contents;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Applies {@linkcode updateQuestFlavorBlock} and {@linkcode updateQuestProjectGradle}. */
export const withQuestGradle: ConfigPlugin<ResolvedQuestOptions> = (config, options) => {
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = updateQuestFlavorBlock(cfg.modResults.contents, options);
    return cfg;
  });
  return withProjectBuildGradle(config, (cfg) => {
    cfg.modResults.contents = updateQuestProjectGradle(cfg.modResults.contents);
    return cfg;
  });
};
