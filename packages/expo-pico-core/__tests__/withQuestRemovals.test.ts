import { resolveOptions } from '../plugin/src/types';
import {
  QUEST_EXCLUSIONS_MARKER,
  applyQuestExclusionsGradle,
  applyQuestManifestRemovals,
  normalizeDependencyExclusions,
  renderQuestExclusionsBlock,
} from '../plugin/src/withQuestRemovals';

type Entry = { $: Record<string, string | undefined> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function questManifest(extra: Record<string, Entry[]> = {}): any {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        'xmlns:tools': 'http://schemas.android.com/tools',
      },
      'uses-permission': [
        { $: { 'android:name': 'com.oculus.permission.RENDER_MODEL' } },
        { $: { 'android:name': 'android.permission.USB_CAMERA', 'tools:node': 'remove' } },
        ...(extra['uses-permission'] ?? []),
      ],
      'uses-feature': [
        { $: { 'android:name': 'android.hardware.vr.headtracking', 'android:required': 'true' } },
        ...(extra['uses-feature'] ?? []),
      ],
      application: [{ $: {} }],
    },
  };
}

const removed = (m: { manifest: Record<string, Entry[]> }, tag: string) =>
  (m.manifest[tag] ?? [])
    .filter((e) => e.$['tools:node'] === 'remove')
    .map((e) => e.$['android:name']);

const PERMS = [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.CAMERA',
  'horizonos.permission.HEADSET_CAMERA',
];

describe('quest removal options', () => {
  it('default to nothing', () => {
    const o = resolveOptions({});
    expect(o.questRemovePermissions).toEqual([]);
    expect(o.questRemoveFeatures).toEqual([]);
    expect(o.questExcludeDependencies).toEqual([]);
  });

  it('trim and de-duplicate names', () => {
    const o = resolveOptions({
      questRemovePermissions: [' android.permission.CAMERA ', 'android.permission.CAMERA', ''],
    });
    expect(o.questRemovePermissions).toEqual(['android.permission.CAMERA']);
  });

  it('reject a dependency that is not group:module', () => {
    expect(() => normalizeDependencyExclusions(['play-services-location'])).toThrow(/group:module/);
    expect(() =>
      normalizeDependencyExclusions(['com.google.android.gms:play-services-location:21.0.1'])
    ).toThrow(/group:module/);
    expect(
      normalizeDependencyExclusions([
        'com.google.android.gms:play-services-location',
        'com.google.android.gms:play-services-location',
      ])
    ).toEqual(['com.google.android.gms:play-services-location']);
  });
});

describe('applyQuestManifestRemovals', () => {
  it('adds a tools:node="remove" entry per permission and feature', () => {
    const m = questManifest();
    expect(applyQuestManifestRemovals(m, PERMS, ['android.hardware.camera'])).toBe(true);
    expect(removed(m, 'uses-permission')).toEqual(['android.permission.USB_CAMERA', ...PERMS]);
    expect(removed(m, 'uses-feature')).toEqual(['android.hardware.camera']);
  });

  it('keeps every unrelated entry', () => {
    const m = questManifest();
    applyQuestManifestRemovals(m, PERMS, ['android.hardware.camera']);
    const perms = m.manifest['uses-permission'] as Entry[];
    expect(perms[0].$).toEqual({ 'android:name': 'com.oculus.permission.RENDER_MODEL' });
    const head = (m.manifest['uses-feature'] as Entry[])[0];
    expect(head.$['android:required']).toBe('true');
  });

  it('turns an existing declaration into a removal instead of duplicating it', () => {
    const m = questManifest({
      'uses-permission': [
        { $: { 'android:name': 'android.permission.CAMERA' } },
        { $: { 'android:name': 'android.permission.CAMERA' } },
      ],
    });
    applyQuestManifestRemovals(m, ['android.permission.CAMERA'], []);
    const camera = (m.manifest['uses-permission'] as Entry[]).filter(
      (e) => e.$['android:name'] === 'android.permission.CAMERA'
    );
    expect(camera).toEqual([
      { $: { 'android:name': 'android.permission.CAMERA', 'tools:node': 'remove' } },
    ]);
  });

  it('is idempotent', () => {
    const m = questManifest();
    applyQuestManifestRemovals(m, PERMS, ['android.hardware.camera']);
    const once = JSON.stringify(m);
    expect(applyQuestManifestRemovals(m, PERMS, ['android.hardware.camera'])).toBe(false);
    expect(JSON.stringify(m)).toBe(once);
  });

  it('declares the tools namespace when the manifest lacks it', () => {
    const m = questManifest();
    delete m.manifest.$['xmlns:tools'];
    applyQuestManifestRemovals(m, ['android.permission.CAMERA'], []);
    expect(m.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
  });

  it('changes nothing with empty lists', () => {
    const m = questManifest();
    expect(applyQuestManifestRemovals(m, [], [])).toBe(false);
  });
});

const BASE_GRADLE = `android {\n}\n\ndependencies {\n    implementation 'com.google.android.gms:play-services-location:21.0.1'\n}\n`;
const LOCATION = 'com.google.android.gms:play-services-location';

describe('quest dependency exclusions', () => {
  it('excludes only from quest compile and runtime classpaths', () => {
    const block = renderQuestExclusionsBlock([LOCATION]);
    expect(block).toContain('c.name.startsWith("quest")');
    expect(block).toMatch(/CompileClasspath.*RuntimeClasspath/);
    expect(block).toContain(
      'c.exclude group: "com.google.android.gms", module: "play-services-location"'
    );
    expect(block).not.toMatch(/startsWith\("(pico|mobile)"\)|\b(pico|mobile)[A-Z]\w*Classpath/);
  });

  it('leaves the dependency declaration itself in place for other flavors', () => {
    const out = applyQuestExclusionsGradle(BASE_GRADLE, [LOCATION]);
    expect(out).toContain("implementation 'com.google.android.gms:play-services-location:21.0.1'");
  });

  it('is idempotent and removable', () => {
    const once = applyQuestExclusionsGradle(BASE_GRADLE, [LOCATION]);
    expect(applyQuestExclusionsGradle(once, [LOCATION])).toBe(once);
    expect(once.split(QUEST_EXCLUSIONS_MARKER).length - 1).toBe(1);
    const off = applyQuestExclusionsGradle(once, []);
    expect(off).not.toContain(QUEST_EXCLUSIONS_MARKER);
    expect(off.trimEnd()).toBe(BASE_GRADLE.trimEnd());
  });
});
