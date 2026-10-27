import {
  PICO_NATIVE_PACKAGES,
  PICO_NITRO_DEPS_MARKER,
  PICO_NITRO_INCLUDE_MARKER,
  stripDependencyBlock,
  stripIncludeBlock,
} from '../plugin/src/withPicoNitroModules';
// The generator earlier versions shipped, so the cleanup is tested against the
// exact text those versions wrote.
import {
  gradleProjectName,
  renderIncludeBlock,
  type PicoNativeModule,
} from './support/legacyPicoNitroModules';

const SETTINGS = `rootProject.name = 'app'
include ':app'
includeBuild('../node_modules/@react-native/gradle-plugin')
`;

const APP_GRADLE = `apply plugin: "com.android.application"

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

const modules: PicoNativeModule[] = PICO_NATIVE_PACKAGES.map((packageName) => ({
  packageName,
  projectName: gradleProjectName(packageName),
  androidDir: `/repo/node_modules/${packageName}/android`,
}));

const legacySettings = SETTINGS + renderIncludeBlock(modules, '/repo/android', SETTINGS);

const legacyDeps =
  `${PICO_NITRO_DEPS_MARKER}\ndependencies {\n` +
  modules.map((m) => `    implementation project(':${m.projectName}')`).join('\n') +
  '\n}\n';
const legacyAppGradle = `${APP_GRADLE.trimEnd()}\n\n${legacyDeps}`;

describe('stripIncludeBlock', () => {
  it('removes every include an earlier prebuild appended', () => {
    expect(legacySettings).toContain(PICO_NITRO_INCLUDE_MARKER);
    const out = stripIncludeBlock(legacySettings);
    expect(out).not.toContain(PICO_NITRO_INCLUDE_MARKER);
    expect(out).not.toMatch(/expo-pico-/);
    expect(out).toBe(SETTINGS);
  });

  it('leaves a settings.gradle without the block untouched', () => {
    expect(stripIncludeBlock(SETTINGS)).toBe(SETTINGS);
  });

  it('keeps lines after the block', () => {
    const out = stripIncludeBlock(`${legacySettings}include ':other'\n`);
    expect(out).toContain("include ':other'");
    expect(out).not.toMatch(/expo-pico-/);
  });

  it('is idempotent', () => {
    const once = stripIncludeBlock(legacySettings);
    expect(stripIncludeBlock(once)).toBe(once);
  });
});

describe('stripDependencyBlock', () => {
  it('removes the implementation project lines an earlier prebuild appended', () => {
    const out = stripDependencyBlock(legacyAppGradle);
    expect(out).not.toContain(PICO_NITRO_DEPS_MARKER);
    expect(out).not.toMatch(/expo-pico-/);
    expect(out).toContain('implementation("com.facebook.react:react-android")');
  });

  it('leaves an app/build.gradle without the block untouched', () => {
    expect(stripDependencyBlock(APP_GRADLE)).toBe(APP_GRADLE);
  });
});
