import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { resolveOptions } from '../plugin/src/types';
import {
  META_LAYOUT_GRADLE_MARKER,
  META_LAYOUT_STUB_CLASSES,
  META_LAYOUT_STUB_DIR,
  METAVRX_BOM,
  META_LAYOUT_LIBRARY_NAMESPACES,
  applyMetaLayoutGradle,
  applyMetaLayoutOverrideLibrary,
  renderMetaLayoutGradleBlock,
  syncMetaLayoutStubs,
} from '../plugin/src/withQuestMetaLayout';

const BASE_GRADLE = `apply plugin: "com.android.application"

android {
    namespace "com.example.app"
}

dependencies {
    implementation("com.facebook.react:react-android")
}
`;

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/** Every line of the block that declares a dependency. */
function dependencyLines(block: string): string[] {
  const deps = block.slice(block.indexOf('dependencies {'), block.indexOf('}\n') + 1);
  return deps
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'dependencies {' && l !== '}');
}

describe('metaLayoutSdk option', () => {
  it('is off unless set to true', () => {
    expect(resolveOptions({}).metaLayoutSdk).toBe(false);
    expect(resolveOptions({ metaLayoutSdk: undefined }).metaLayoutSdk).toBe(false);
    expect(resolveOptions({ metaLayoutSdk: true }).metaLayoutSdk).toBe(true);
  });
});

describe('renderMetaLayoutGradleBlock', () => {
  const block = renderMetaLayoutGradleBlock();

  it('declares the BOM and both artifacts as questImplementation only', () => {
    const lines = dependencyLines(block);
    expect(lines).toEqual([
      `questImplementation platform("${METAVRX_BOM}")`,
      'questImplementation "com.meta.metavrx.layout:layout-react-compat"',
      'questImplementation "com.meta.metavrx.layout:layout-window-react-compat"',
    ]);
    for (const l of lines) expect(l.startsWith('questImplementation')).toBe(true);
  });

  it('pins no artifact version outside the BOM', () => {
    expect(block).not.toMatch(/layout-(window-)?react-compat:\d/);
  });

  it('never puts the SDK on a pico, mobile or bare configuration', () => {
    expect(block).not.toMatch(
      /^\s*(implementation|api|picoImplementation|mobileImplementation)\b/m
    );
  });

  it('strips the transitive AARs from non-quest classpaths only', () => {
    expect(block).toContain('!c.name.startsWith("quest")');
    expect(block).toContain('c.exclude group: "com.meta.metavrx.layout"');
    expect(block).toMatch(/CompileClasspath.*RuntimeClasspath/);
  });

  it('adds the stub source set to every flavor except quest', () => {
    expect(block).toContain('if (flavor.name != "quest")');
    expect(block).toContain(`java.srcDirs += "${META_LAYOUT_STUB_DIR}"`);
  });
});

describe('applyMetaLayoutGradle', () => {
  it('appends one block when enabled', () => {
    const out = applyMetaLayoutGradle(BASE_GRADLE, true);
    expect(out.startsWith(BASE_GRADLE.trimEnd())).toBe(true);
    expect(count(out, META_LAYOUT_GRADLE_MARKER)).toBe(1);
  });

  it('is idempotent across repeated prebuilds', () => {
    const once = applyMetaLayoutGradle(BASE_GRADLE, true);
    const twice = applyMetaLayoutGradle(once, true);
    const thrice = applyMetaLayoutGradle(twice, true);
    expect(twice).toBe(once);
    expect(thrice).toBe(once);
  });

  it('replaces a stale block instead of stacking a second one', () => {
    const stale = applyMetaLayoutGradle(BASE_GRADLE, true).replace(
      'layout-window-react-compat',
      'layout-window-react-compat-OLD'
    );
    const out = applyMetaLayoutGradle(stale, true);
    expect(count(out, META_LAYOUT_GRADLE_MARKER)).toBe(1);
    expect(out).not.toContain('-OLD');
  });

  it('removes the block when switched off and leaves the rest untouched', () => {
    const on = applyMetaLayoutGradle(BASE_GRADLE, true);
    const off = applyMetaLayoutGradle(on, false);
    expect(off).not.toContain(META_LAYOUT_GRADLE_MARKER);
    expect(off).not.toContain('metavrx');
    expect(off.trimEnd()).toBe(BASE_GRADLE.trimEnd());
  });

  it('writes nothing when never enabled', () => {
    expect(applyMetaLayoutGradle(BASE_GRADLE, false)).toBe(BASE_GRADLE);
  });
});

describe('syncMetaLayoutStubs', () => {
  let appRoot: string;
  beforeEach(() => {
    appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-layout-'));
  });
  afterEach(() => {
    fs.rmSync(appRoot, { recursive: true, force: true });
  });

  const stubFile = (fqcn: string) =>
    path.join(appRoot, META_LAYOUT_STUB_DIR, ...fqcn.split('.')) + '.java';

  it('writes an empty ReactPackage under each vendor class name', () => {
    syncMetaLayoutStubs(appRoot, true);
    for (const fqcn of META_LAYOUT_STUB_CLASSES) {
      const body = fs.readFileSync(stubFile(fqcn), 'utf8');
      const pkg = fqcn.slice(0, fqcn.lastIndexOf('.'));
      const name = fqcn.slice(fqcn.lastIndexOf('.') + 1);
      expect(body).toContain(`package ${pkg};`);
      expect(body).toContain(`public final class ${name} implements ReactPackage`);
      expect(count(body, 'Collections.emptyList()')).toBe(2);
    }
  });

  it('never writes into the main or quest source sets', () => {
    syncMetaLayoutStubs(appRoot, true);
    expect(fs.existsSync(path.join(appRoot, 'src', 'main'))).toBe(false);
    expect(fs.existsSync(path.join(appRoot, 'src', 'quest'))).toBe(false);
  });

  it('is idempotent and leaves unchanged files alone', () => {
    syncMetaLayoutStubs(appRoot, true);
    const file = stubFile(META_LAYOUT_STUB_CLASSES[0]);
    // Back-date by whole seconds, then compare the file to itself: a stat
    // round-trip need not equal the Date that was set at sub-ms precision.
    const past = new Date(Math.floor(Date.now() / 1000) * 1000 - 60_000);
    fs.utimesSync(file, past, past);
    const before = fs.statSync(file).mtimeMs;
    syncMetaLayoutStubs(appRoot, true);
    expect(fs.statSync(file).mtimeMs).toBe(before);
  });

  it('removes the stub source set when switched off', () => {
    syncMetaLayoutStubs(appRoot, true);
    syncMetaLayoutStubs(appRoot, false);
    expect(fs.existsSync(path.join(appRoot, 'src', 'metaLayoutStub'))).toBe(false);
  });
});

describe('applyMetaLayoutOverrideLibrary', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const manifest = (usesSdk?: Record<string, string>): any => ({
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      ...(usesSdk ? { 'uses-sdk': [{ $: usesSdk }] } : {}),
      application: [{ $: {} }],
    },
  });
  const overrides = (m: { manifest: Record<string, unknown> }) =>
    (
      (m.manifest['uses-sdk'] as { $: Record<string, string> }[])[0].$['tools:overrideLibrary'] ??
      ''
    )
      .split(',')
      .filter(Boolean);

  it('lists both library namespaces and declares the tools namespace', () => {
    const m = manifest();
    expect(applyMetaLayoutOverrideLibrary(m, true)).toBe(true);
    expect(overrides(m)).toEqual([...META_LAYOUT_LIBRARY_NAMESPACES]);
    expect(m.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
  });

  it('keeps entries from other libraries and is idempotent', () => {
    const m = manifest({ 'tools:overrideLibrary': 'com.other.lib' });
    applyMetaLayoutOverrideLibrary(m, true);
    expect(applyMetaLayoutOverrideLibrary(m, true)).toBe(false);
    expect(overrides(m)).toEqual(['com.other.lib', ...META_LAYOUT_LIBRARY_NAMESPACES]);
  });

  it('removes only its own entries when switched off', () => {
    const m = manifest({ 'tools:overrideLibrary': 'com.other.lib' });
    applyMetaLayoutOverrideLibrary(m, true);
    applyMetaLayoutOverrideLibrary(m, false);
    expect(overrides(m)).toEqual(['com.other.lib']);
  });

  it('drops a uses-sdk element it created once nothing is left', () => {
    const m = manifest();
    applyMetaLayoutOverrideLibrary(m, true);
    applyMetaLayoutOverrideLibrary(m, false);
    expect(m.manifest['uses-sdk']).toBeUndefined();
  });

  it('changes nothing when never enabled', () => {
    const m = manifest();
    expect(applyMetaLayoutOverrideLibrary(m, false)).toBe(false);
  });
});
