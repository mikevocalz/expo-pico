import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedQuestOptions } from './types';

/**
 * Meta VR Layout SDK, linked into the `quest` flavor only.
 *
 * Meta's setup (meta-vr-layout-sdk, 2026-08-27) is three Gradle lines plus
 * React Native autolinking of `@metavr/layout-compat` and
 * `@metavr/layout-window-compat`. Followed literally, every flavor would get
 * the SDK:
 *
 *  - Each npm package autolinks an Android library project that declares its
 *    AAR as `api(...)`, so `pico` and `mobile` inherit it transitively. The
 *    window AAR's manifest adds
 *    `horizonos.permission.MANAGE_APP_VOLUMETRIC_WINDOWS` and Horizon OS SDK
 *    declarations, which have no business in a PICO or phone APK.
 *  - The generated `PackageList` (main source set) calls
 *    `new SpatialScenePackage()` / `new SpatialWindowPackage()`, so a flavor
 *    without the AAR does not compile.
 *
 * The library projects cannot simply be unlinked: the AAR classes extend
 * codegen output (`NativeSpatialSceneModuleSpec`,
 * `SpatialWindowViewManagerInterface`) that only their autolinked projects
 * generate, and the C++ component descriptor comes from the same place. So
 * this keeps autolinking and instead:
 *
 *  1. declares the BOM and both artifacts as `questImplementation`;
 *  2. excludes `com.meta.metavrx.layout` from every non-quest compile and
 *     runtime classpath, which drops the transitive `api` AARs there;
 *  3. adds a stub source set to every non-quest flavor with two empty
 *     `ReactPackage`s under the vendor class names, so `PackageList` compiles
 *     and registers nothing;
 *  4. lists both library projects in the main manifest's
 *     `tools:overrideLibrary`. They declare minSdk 29, and a phone flavor
 *     below that fails the manifest merger. Off quest they carry only codegen
 *     specs and an autolink placeholder that nothing calls, so the override
 *     cannot reach code that needs API 29.
 *
 * JS must not render Meta's components on those flavors: the codegen'd
 * `SpatialWindowView` descriptor exists everywhere, but its view manager only
 * exists on quest. The example's `src/layout/metaWindows.ts` gates on
 * `isHorizonBuild`.
 */

export const META_LAYOUT_GRADLE_MARKER = '// expo-pico-core: Meta VR Layout SDK (quest only)';
const META_LAYOUT_GRADLE_END = '// expo-pico-core: end Meta VR Layout SDK';

export const METAVRX_BOM = 'com.meta.metavrx:metavrx-bom:1.2026.0.0';
export const META_LAYOUT_GROUP = 'com.meta.metavrx.layout';
export const META_LAYOUT_ARTIFACTS = [
  `${META_LAYOUT_GROUP}:layout-react-compat`,
  `${META_LAYOUT_GROUP}:layout-window-react-compat`,
] as const;

/** Source dir, relative to `android/app`, added to every non-quest flavor. */
export const META_LAYOUT_STUB_DIR = 'src/metaLayoutStub/java';

/** The two ReactPackage classes the generated PackageList instantiates. */
export const META_LAYOUT_STUB_CLASSES = [
  'metavrx.layout.react.SpatialScenePackage',
  'metavrx.layout.window.react.SpatialWindowPackage',
] as const;

/** Namespaces of the two autolinked library projects (their build.gradle.kts). */
export const META_LAYOUT_LIBRARY_NAMESPACES = [
  'metavrx.layout.react.cxx',
  'metavrx.layout.window.react.cxx',
] as const;

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type UsesSdk = { $?: Record<string, string | undefined> };

/**
 * Adds (enabled) or removes (disabled) the library namespaces in
 * `<uses-sdk tools:overrideLibrary>`, keeping any other entries. Returns true
 * when the manifest changed.
 */
export function applyMetaLayoutOverrideLibrary(manifest: Manifest, enabled: boolean): boolean {
  const before = JSON.stringify(manifest);
  const root = manifest.manifest as unknown as Record<string, unknown> & {
    $: Record<string, string>;
  };
  const sdks = (root['uses-sdk'] as UsesSdk[] | undefined) ?? [];
  const current = (sdks[0]?.$?.['tools:overrideLibrary'] ?? '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  const ours: readonly string[] = META_LAYOUT_LIBRARY_NAMESPACES;
  const others = current.filter((n) => !ours.includes(n));
  const next = enabled ? [...others, ...ours] : others;

  if (next.length === 0) {
    if (sdks[0]?.$) {
      delete sdks[0].$['tools:overrideLibrary'];
      if (Object.keys(sdks[0].$).length === 0) delete sdks[0].$;
    }
    if (sdks.length === 1 && !sdks[0].$) delete root['uses-sdk'];
  } else {
    root.$['xmlns:tools'] = root.$['xmlns:tools'] ?? 'http://schemas.android.com/tools';
    const sdk = sdks[0] ?? {};
    sdk.$ = { ...(sdk.$ ?? {}), 'tools:overrideLibrary': next.join(',') };
    root['uses-sdk'] = [sdk, ...sdks.slice(1)];
  }
  return JSON.stringify(manifest) !== before;
}

export function renderMetaLayoutGradleBlock(): string {
  const deps = META_LAYOUT_ARTIFACTS.map((a) => `    questImplementation "${a}"`).join('\n');
  return `${META_LAYOUT_GRADLE_MARKER}
// Versions come from the BOM. Both artifacts are quest-only: see
// expo-horizon-quest plugin/src/withQuestMetaLayout.ts for why the autolinked
// @metavr/* projects are filtered out of every other flavor below.
dependencies {
    questImplementation platform("${METAVRX_BOM}")
${deps}
}
configurations.configureEach { c ->
    if (!c.name.startsWith("quest") && (c.name.endsWith("CompileClasspath") || c.name.endsWith("RuntimeClasspath"))) {
        c.exclude group: "${META_LAYOUT_GROUP}"
    }
}
android.productFlavors.configureEach { flavor ->
    if (flavor.name != "quest") {
        android.sourceSets.maybeCreate(flavor.name).java.srcDirs += "${META_LAYOUT_STUB_DIR}"
    }
}
${META_LAYOUT_GRADLE_END}
`;
}

/** Removes a previously written block, so turning the option off sticks. */
export function stripMetaLayoutGradleBlock(contents: string): string {
  const start = contents.indexOf(META_LAYOUT_GRADLE_MARKER);
  if (start === -1) return contents;
  const endMarker = contents.indexOf(META_LAYOUT_GRADLE_END, start);
  if (endMarker === -1) return contents;
  let end = endMarker + META_LAYOUT_GRADLE_END.length;
  if (contents[end] === '\n') end += 1;
  let from = start;
  if (from > 0 && contents[from - 1] === '\n') from -= 1;
  return contents.slice(0, from) + contents.slice(end);
}

/** Returns app/build.gradle with exactly one current block, or none. */
export function applyMetaLayoutGradle(contents: string, enabled: boolean): string {
  const stripped = stripMetaLayoutGradleBlock(contents);
  if (!enabled) return stripped;
  return stripped.replace(/\n*$/, '\n\n') + renderMetaLayoutGradleBlock();
}

export function renderStubPackage(fqcn: string): string {
  const dot = fqcn.lastIndexOf('.');
  const pkg = fqcn.slice(0, dot);
  const name = fqcn.slice(dot + 1);
  return `// Generated by expo-horizon-core (metaLayoutSdk). Do not edit.
//
// Compiled into every flavor except quest, where the real class comes from the
// Meta VR Layout SDK AAR. The generated PackageList instantiates this class in
// all flavors; here it registers nothing.
package ${pkg};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.Collections;
import java.util.List;

@SuppressWarnings({"rawtypes"})
public final class ${name} implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;
}

function stubPath(appRoot: string, fqcn: string): string {
  return path.join(appRoot, META_LAYOUT_STUB_DIR, ...fqcn.split('.')) + '.java';
}

/** Writes (enabled) or removes (disabled) the stub source set under `android/app`. */
export function syncMetaLayoutStubs(appRoot: string, enabled: boolean): void {
  const stubRoot = path.join(appRoot, path.dirname(META_LAYOUT_STUB_DIR));
  if (!enabled) {
    fs.rmSync(stubRoot, { recursive: true, force: true });
    return;
  }
  for (const fqcn of META_LAYOUT_STUB_CLASSES) {
    const file = stubPath(appRoot, fqcn);
    const body = renderStubPackage(fqcn);
    if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === body) continue;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
}

export const withQuestMetaLayout: ConfigPlugin<ResolvedQuestOptions> = (config, options) => {
  const enabled = options.metaLayoutSdk;
  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      if (enabled) {
        console.warn(
          '[expo-horizon-quest] metaLayoutSdk needs a Groovy app/build.gradle; skipping the Gradle setup.'
        );
      }
      return cfg;
    }
    cfg.modResults.contents = applyMetaLayoutGradle(cfg.modResults.contents, enabled);
    return cfg;
  });
  config = withAndroidManifest(config, (cfg) => {
    applyMetaLayoutOverrideLibrary(cfg.modResults, enabled);
    return cfg;
  });
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      syncMetaLayoutStubs(path.join(cfg.modRequest.platformProjectRoot, 'app'), enabled);
      return cfg;
    },
  ]);
};
