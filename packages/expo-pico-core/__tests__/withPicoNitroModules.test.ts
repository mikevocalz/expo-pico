import {
  PICO_NATIVE_PACKAGES,
  PICO_NITRO_INCLUDE_MARKER,
  gradleProjectName,
  isAlreadyIncluded,
  renderIncludeBlock,
  type PicoNativeModule,
} from '../plugin/src/withPicoNitroModules';

/**
 * Verbatim copy of `convertPackageToProjectName` from
 * expo-modules-autolinking/build/platforms/android.js @ 3.0.0.
 *
 * Duplicated rather than imported so the test fails if either algorithm
 * drifts — matching Expo's naming is the whole reason this plugin does not
 * double-include a module Expo already linked.
 */
function expoConvertPackageToProjectName(packageName: string): string {
  return packageName.replace(/^@/g, '').replace(/\W+/g, '-');
}

const mod = (packageName: string, androidDir: string): PicoNativeModule => ({
  packageName,
  projectName: gradleProjectName(packageName),
  androidDir,
});

describe('gradleProjectName', () => {
  it('matches expo-modules-autolinking for every package in the family', () => {
    for (const pkg of PICO_NATIVE_PACKAGES) {
      expect(gradleProjectName(pkg)).toBe(expoConvertPackageToProjectName(pkg));
    }
  });

  it('produces the name the old cross-project dependency used', () => {
    expect(gradleProjectName('@expo-pico/core')).toBe('expo-pico-core');
  });

  it('leaves an unscoped package alone', () => {
    expect(gradleProjectName('react-native-nitro-modules')).toBe('react-native-nitro-modules');
  });
});

describe('isAlreadyIncluded', () => {
  it.each([
    ["include ':expo-pico-core'", 'plain'],
    ['include ":expo-pico-core"', 'double-quoted'],
    ["include(':expo-pico-core')", 'parenthesised'],
    ["include( ':expo-pico-core' )", 'parenthesised with spaces'],
    ["include ':expo-pico-core', ':other'", 'first of a list'],
  ])('detects %s (%s)', (line) => {
    expect(isAlreadyIncluded(`rootProject.name = 'app'\n${line}\n`, 'expo-pico-core')).toBe(true);
  });

  it('does not match a different project with the same prefix', () => {
    const contents = "include ':expo-pico-core-extras'";
    expect(isAlreadyIncluded(contents, 'expo-pico-core')).toBe(false);
  });

  it('does not match a bare mention in a comment', () => {
    expect(isAlreadyIncluded('// expo-pico-core is linked elsewhere', 'expo-pico-core')).toBe(
      false
    );
  });

  it('returns false for an empty settings.gradle', () => {
    expect(isAlreadyIncluded('', 'expo-pico-core')).toBe(false);
  });
});

describe('renderIncludeBlock', () => {
  const modules = [
    mod('@expo-pico/core', '/app/node_modules/@expo-pico/core/android'),
    mod('@expo-pico/account', '/app/node_modules/@expo-pico/account/android'),
  ];
  const androidRoot = '/app/android';

  it('emits an include and a projectDir for each missing module', () => {
    const block = renderIncludeBlock(modules, androidRoot, "rootProject.name = 'app'");
    expect(block).toContain("include ':expo-pico-core'");
    expect(block).toContain("include ':expo-pico-account'");
    expect(block).toContain(
      "project(':expo-pico-core').projectDir = new File(rootProject.projectDir, '../node_modules/@expo-pico/core/android')"
    );
  });

  it('returns null when everything is already included', () => {
    const existing = "include ':expo-pico-core'\ninclude ':expo-pico-account'\n";
    expect(renderIncludeBlock(modules, androidRoot, existing)).toBeNull();
  });

  it('skips only the module Expo already linked', () => {
    // The exact shape expo-modules-autolinking writes.
    const existing = "include ':expo-pico-core'\n";
    const block = renderIncludeBlock(modules, androidRoot, existing);
    expect(block).not.toBeNull();
    expect(block).not.toContain("include ':expo-pico-core'");
    expect(block).toContain("include ':expo-pico-account'");
  });

  it('never includes the same project twice in one block', () => {
    const block = renderIncludeBlock(modules, androidRoot, '') ?? '';
    for (const m of modules) {
      const line = `include ':${m.projectName}'`;
      expect(block.split('\n').filter((l) => l.trim() === line)).toHaveLength(1);
    }
  });

  it('is idempotent — feeding its own output back produces nothing', () => {
    const first = renderIncludeBlock(modules, androidRoot, '') ?? '';
    expect(renderIncludeBlock(modules, androidRoot, first)).toBeNull();
  });

  it('writes forward-slash paths relative to the android project root', () => {
    const block = renderIncludeBlock(modules, androidRoot, '') ?? '';
    expect(block).not.toMatch(/\\/);
    expect(block).toContain("new File(rootProject.projectDir, '../node_modules/");
  });

  it('carries the marker so the block is identifiable in a diff', () => {
    expect(renderIncludeBlock(modules, androidRoot, '')).toContain(PICO_NITRO_INCLUDE_MARKER);
  });

  it('handles a workspace-linked package outside node_modules', () => {
    const linked = [mod('@expo-pico/core', '/repo/packages/expo-pico-core/android')];
    const block = renderIncludeBlock(linked, '/repo/example/android', '') ?? '';
    expect(block).toContain(
      "project(':expo-pico-core').projectDir = new File(rootProject.projectDir, '../../packages/expo-pico-core/android')"
    );
  });
});
