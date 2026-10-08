import { AndroidConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  LIBRARY_META_ENTRIES,
  applyMetaEntryRemovals,
  collectMetaEntries,
  isMetaOnlyName,
  mergeMetaEntries,
  metaFreeFlavors,
  syncMetaEntryRemovals,
} from '../plugin/src/withMetaEntryRemovals';

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type Entry = { $: Record<string, string>; [key: string]: unknown };

/** The main manifest @reactvision/react-viro 3.0.2 writes with xRMode QUEST. */
function viroMainManifest(): Manifest {
  return {
    manifest: {
      $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
      'uses-permission': [
        { $: { 'android:name': 'android.permission.CAMERA' } },
        { $: { 'android:name': 'com.oculus.permission.EYE_TRACKING' } },
        { $: { 'android:name': 'com.oculus.permission.HAND_TRACKING' } },
        { $: { 'android:name': 'com.oculus.permission.USE_SCENE' } },
        { $: { 'android:name': 'horizonos.permission.HEADSET_CAMERA' } },
        { $: { 'android:name': 'horizonos.permission.USE_ANCHOR_API' } },
      ],
      'uses-feature': [
        { $: { 'android:name': 'android.hardware.vr.headtracking', 'android:required': 'true' } },
        { $: { 'android:name': 'oculus.software.handtracking', 'android:required': 'false' } },
        { $: { 'android:name': 'com.oculus.feature.PASSTHROUGH', 'android:required': 'false' } },
      ],
      application: [
        {
          $: { 'android:name': '.MainApplication' },
          'meta-data': [
            { $: { 'android:name': 'com.google.ar.core', 'android:value': 'optional' } },
            { $: { 'android:name': 'com.oculus.supportedDevices', 'android:value': 'quest3' } },
          ],
          activity: [
            {
              $: { 'android:name': '.MainActivity' },
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
                },
              ],
            },
            {
              $: { 'android:name': '.VRActivity' },
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'com.oculus.intent.category.VR' } }],
                },
              ],
              'meta-data': [
                { $: { 'android:name': 'com.oculus.vr.focusaware', 'android:value': 'true' } },
              ],
            },
          ],
        },
      ],
    },
  } as unknown as Manifest;
}

function picoFlavorManifest(): Manifest {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        'xmlns:tools': 'http://schemas.android.com/tools',
      },
      'uses-permission': [{ $: { 'android:name': 'com.picovr.permission.EYE_TRACKING' } }],
      'uses-feature': [
        { $: { 'android:name': 'android.hardware.vr.headtracking', 'android:required': 'false' } },
      ],
      application: [
        {
          $: { 'android:allowBackup': 'false' },
          'meta-data': [{ $: { 'android:name': 'pvr.app.type', 'android:value': 'mr' } }],
          activity: [
            {
              $: { 'android:name': '.VRActivity', 'tools:node': 'merge' },
              'intent-filter': [
                {
                  action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
                  category: [{ $: { 'android:name': 'com.pico.intent.category.VR' } }],
                },
              ],
            },
          ],
        },
      ],
    },
  } as unknown as Manifest;
}

const removedNames = (list: unknown): string[] =>
  ((list ?? []) as Entry[])
    .filter((e) => e.$['tools:node'] === 'remove')
    .map((e) => e.$['android:name']);

const appOf = (m: Manifest) => (m.manifest.application as unknown as Entry[])[0];
const activityOf = (m: Manifest, name: string) =>
  ((appOf(m).activity as Entry[]) ?? []).find((a) => a.$['android:name'] === name)!;

describe('isMetaOnlyName', () => {
  it('matches the Meta prefixes only', () => {
    for (const name of [
      'com.oculus.permission.HAND_TRACKING',
      'oculus.software.handtracking',
      'horizonos.permission.USE_ANCHOR_API',
      'com.meta.store.defaultDeviceTargets',
    ]) {
      expect(isMetaOnlyName(name)).toBe(true);
    }
    for (const name of [
      'android.hardware.vr.headtracking',
      'com.picovr.permission.EYE_TRACKING',
      'pvr.app.type',
      'com.metadata.thing',
      undefined,
    ]) {
      expect(isMetaOnlyName(name)).toBe(false);
    }
  });
});

describe('collectMetaEntries', () => {
  it('collects every Meta entry by prefix and nothing else', () => {
    const entries = collectMetaEntries(viroMainManifest());
    expect(entries.permissions).toEqual([
      'com.oculus.permission.EYE_TRACKING',
      'com.oculus.permission.HAND_TRACKING',
      'com.oculus.permission.USE_SCENE',
      'horizonos.permission.HEADSET_CAMERA',
      'horizonos.permission.USE_ANCHOR_API',
    ]);
    expect(entries.features).toEqual([
      'oculus.software.handtracking',
      'com.oculus.feature.PASSTHROUGH',
    ]);
    expect(entries.applicationMetaData).toEqual(['com.oculus.supportedDevices']);
    expect(entries.activities).toEqual([
      {
        name: '.VRActivity',
        metaData: ['com.oculus.vr.focusaware'],
        intentFilters: [
          {
            actions: ['android.intent.action.MAIN'],
            categories: ['com.oculus.intent.category.VR'],
          },
        ],
      },
    ]);
  });

  it('skips an intent filter that mixes Meta and other categories', () => {
    const m = viroMainManifest();
    const vr = activityOf(m, '.VRActivity');
    ((vr['intent-filter'] as Entry[])[0].category as Entry[]).push({
      $: { 'android:name': 'android.intent.category.DEFAULT' },
    });
    expect(collectMetaEntries(m).activities[0].intentFilters).toEqual([]);
  });

  it('adds the library entries on merge without duplicates', () => {
    const merged = mergeMetaEntries(collectMetaEntries(viroMainManifest()), LIBRARY_META_ENTRIES);
    expect(
      merged.permissions.filter((n) => n === 'com.oculus.permission.EYE_TRACKING')
    ).toHaveLength(1);
    expect(merged.features).toContain('oculus.software.eye_tracking');
  });
});

describe('applyMetaEntryRemovals', () => {
  const entries = () =>
    mergeMetaEntries(collectMetaEntries(viroMainManifest()), LIBRARY_META_ENTRIES);

  it('writes a removal marker for every Meta entry and keeps PICO entries', () => {
    const m = picoFlavorManifest();
    expect(applyMetaEntryRemovals(m, entries())).toBe(true);
    expect(removedNames(m.manifest['uses-permission'])).toEqual([
      'com.oculus.permission.EYE_TRACKING',
      'com.oculus.permission.HAND_TRACKING',
      'com.oculus.permission.USE_SCENE',
      'horizonos.permission.HEADSET_CAMERA',
      'horizonos.permission.USE_ANCHOR_API',
    ]);
    expect(removedNames(m.manifest['uses-feature'])).toEqual([
      'oculus.software.handtracking',
      'com.oculus.feature.PASSTHROUGH',
      'oculus.software.eye_tracking',
    ]);
    expect(removedNames(appOf(m)['meta-data'])).toEqual(['com.oculus.supportedDevices']);
    // PICO's own entries and headtracking survive untouched.
    const perms = m.manifest['uses-permission'] as unknown as Entry[];
    expect(perms[0].$).toEqual({ 'android:name': 'com.picovr.permission.EYE_TRACKING' });
    const head = (m.manifest['uses-feature'] as unknown as Entry[])[0];
    expect(head.$).toEqual({
      'android:name': 'android.hardware.vr.headtracking',
      'android:required': 'false',
    });
  });

  it('removes the Oculus filter and meta-data on the existing VRActivity entry', () => {
    const m = picoFlavorManifest();
    applyMetaEntryRemovals(m, entries());
    const activities = appOf(m).activity as Entry[];
    expect(activities.filter((a) => a.$['android:name'] === '.VRActivity')).toHaveLength(1);
    const vr = activityOf(m, '.VRActivity');
    expect(vr.$['tools:node']).toBe('merge');
    expect(removedNames(vr['meta-data'])).toEqual(['com.oculus.vr.focusaware']);
    const filters = vr['intent-filter'] as Entry[];
    expect(filters).toHaveLength(2);
    expect(filters[0].category).toEqual([{ $: { 'android:name': 'com.pico.intent.category.VR' } }]);
    expect(filters[1]).toEqual({
      $: { 'tools:node': 'remove' },
      action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
      category: [{ $: { 'android:name': 'com.oculus.intent.category.VR' } }],
    });
  });

  it('is idempotent', () => {
    const m = picoFlavorManifest();
    applyMetaEntryRemovals(m, entries());
    const once = JSON.stringify(m);
    expect(applyMetaEntryRemovals(m, entries())).toBe(false);
    expect(JSON.stringify(m)).toBe(once);
  });

  it('turns an existing declaration into a removal instead of duplicating it', () => {
    const m = picoFlavorManifest();
    (m.manifest['uses-permission'] as unknown as Entry[]).push(
      { $: { 'android:name': 'com.oculus.permission.USE_SCENE' } },
      { $: { 'android:name': 'com.oculus.permission.USE_SCENE' } }
    );
    applyMetaEntryRemovals(m, entries());
    const scene = (m.manifest['uses-permission'] as unknown as Entry[]).filter(
      (e) => e.$['android:name'] === 'com.oculus.permission.USE_SCENE'
    );
    expect(scene).toEqual([
      { $: { 'android:name': 'com.oculus.permission.USE_SCENE', 'tools:node': 'remove' } },
    ]);
  });

  it('builds the activity and tools namespace in a bare mobile manifest', () => {
    const m = {
      manifest: { $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' } },
    } as unknown as Manifest;
    applyMetaEntryRemovals(m, entries());
    expect(m.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
    expect(activityOf(m, '.VRActivity').$).toEqual({
      'android:name': '.VRActivity',
      'tools:node': 'merge',
    });
  });

  it('changes nothing with no Meta entries', () => {
    const m = picoFlavorManifest();
    const empty = { permissions: [], features: [], applicationMetaData: [], activities: [] };
    expect(applyMetaEntryRemovals(m, empty)).toBe(false);
  });
});

describe('metaFreeFlavors', () => {
  it('never lists quest', () => {
    expect(metaFreeFlavors({ hasPicoFlavor: true }, true)).toEqual(['pico', 'dual', 'mobile']);
    expect(metaFreeFlavors({ hasPicoFlavor: true }, false)).toEqual(['pico', 'dual']);
    expect(metaFreeFlavors({ hasPicoFlavor: false }, true)).toEqual(['mobile']);
    expect(metaFreeFlavors({ hasPicoFlavor: false }, false)).toEqual([]);
  });
});

describe('syncMetaEntryRemovals', () => {
  let root: string;
  const file = (flavor: string) => path.join(root, 'app', 'src', flavor, 'AndroidManifest.xml');
  const write = async (flavor: string, m: Manifest) => {
    fs.mkdirSync(path.dirname(file(flavor)), { recursive: true });
    await AndroidConfig.Manifest.writeAndroidManifestAsync(file(flavor), m);
  };

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'meta-removals-'));
    await write('main', viroMainManifest());
    await write('pico', picoFlavorManifest());
    await write('quest', {
      manifest: {
        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
        'uses-permission': [{ $: { 'android:name': 'com.oculus.permission.RENDER_MODEL' } }],
      },
    } as unknown as Manifest);
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('edits pico and creates mobile, leaving main and quest byte-identical', async () => {
    const mainBefore = fs.readFileSync(file('main'), 'utf8');
    const questBefore = fs.readFileSync(file('quest'), 'utf8');
    await syncMetaEntryRemovals(root, metaFreeFlavors({ hasPicoFlavor: true }, true));

    expect(fs.readFileSync(file('main'), 'utf8')).toBe(mainBefore);
    expect(fs.readFileSync(file('quest'), 'utf8')).toBe(questBefore);
    expect(fs.existsSync(file('dual'))).toBe(false);
    for (const flavor of ['pico', 'mobile']) {
      const xml = fs.readFileSync(file(flavor), 'utf8');
      expect(xml).toContain(
        '<uses-permission android:name="com.oculus.permission.HAND_TRACKING" tools:node="remove"/>'
      );
      expect(xml).toContain(
        '<meta-data android:name="com.oculus.vr.focusaware" tools:node="remove"/>'
      );
    }
  });

  it('is idempotent on disk', async () => {
    const flavors = metaFreeFlavors({ hasPicoFlavor: true }, true);
    await syncMetaEntryRemovals(root, flavors);
    const pico = fs.readFileSync(file('pico'), 'utf8');
    const mobile = fs.readFileSync(file('mobile'), 'utf8');
    await syncMetaEntryRemovals(root, flavors);
    expect(fs.readFileSync(file('pico'), 'utf8')).toBe(pico);
    expect(fs.readFileSync(file('mobile'), 'utf8')).toBe(mobile);
  });

  it('does nothing for a single-variant app', async () => {
    await syncMetaEntryRemovals(root, metaFreeFlavors({ hasPicoFlavor: false }, false));
    expect(fs.existsSync(file('mobile'))).toBe(false);
    expect(fs.readFileSync(file('pico'), 'utf8')).not.toContain('com.oculus');
  });
});
