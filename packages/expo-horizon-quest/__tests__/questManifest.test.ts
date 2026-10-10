import fs from 'fs';
import os from 'os';
import path from 'path';

import { resolveQuestOptions as resolveOptions } from '../plugin/src/types';
import {
  applyQuestRenderModelEntries,
  syncQuestRenderModel,
} from '../plugin/src/withQuestRenderModel';
import withHorizonQuest from '../plugin/src/index';
import {
  deriveStoreDeviceTargets,
  normalizeStoreDeviceTargets,
  syncQuestStoreDeviceTargets,
} from '../plugin/src/withQuestStoreDeviceTargets';

let root: string;
let platform: string;
function put(file: string, data: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-horizon-quest-'));
  platform = path.join(root, 'android');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
function target(relative: string) {
  return path.join(platform, 'app/src', relative);
}

describe('RENDER_MODEL entries in the quest manifest', () => {
  const PERMISSION = 'com.oculus.permission.RENDER_MODEL';
  const FEATURE = 'com.oculus.feature.RENDER_MODEL';
  const HORIZON_QUEST = [
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
    '  <uses-feature android:name="android.hardware.vr.headtracking" android:required="true"/>',
    '  <application>',
    '    <meta-data android:name="com.oculus.supportedDevices" android:value="quest3"/>',
    '  </application>',
    '</manifest>',
  ].join('\n');
  const manifest = (flavor: string) => target(`${flavor}/AndroidManifest.xml`);
  const read = (flavor: string) => fs.readFileSync(manifest(flavor), 'utf8');
  const count = (xml: string, name: string) => xml.split(`android:name="${name}"`).length - 1;

  beforeEach(() => {
    put(manifest('quest'), HORIZON_QUEST);
    put(manifest('pico'), '<manifest xmlns:android="http://schemas.android.com/apk/res/android"/>');
    put(manifest('main'), '<manifest xmlns:android="http://schemas.android.com/apk/res/android"/>');
  });

  test('the overlay on adds both entries to quest only', async () => {
    await syncQuestRenderModel(platform, resolveOptions({ viroRendererOverlay: true }));
    const quest = read('quest');
    expect(count(quest, PERMISSION)).toBe(1);
    expect(quest).toMatch(
      new RegExp(`<uses-feature android:name="${FEATURE}" android:required="false"/>`)
    );
    // Horizon's own entries survive.
    expect(quest).toContain('android.hardware.vr.headtracking');
    expect(quest).toContain('com.oculus.supportedDevices');
    for (const flavor of ['pico', 'main']) expect(read(flavor)).not.toContain('RENDER_MODEL');
    for (const flavor of ['mobile', 'dual']) expect(fs.existsSync(manifest(flavor))).toBe(false);
  });

  test('is idempotent', async () => {
    const options = resolveOptions({ viroRendererOverlay: true });
    await syncQuestRenderModel(platform, options);
    const first = read('quest');
    const mtime = fs.statSync(manifest('quest')).mtimeMs;
    await syncQuestRenderModel(platform, options);
    expect(read('quest')).toBe(first);
    expect(fs.statSync(manifest('quest')).mtimeMs).toBe(mtime);
    expect(count(first, PERMISSION)).toBe(1);
    expect(count(first, FEATURE)).toBe(1);
  });

  test('removes a stale copy when the overlay is turned off', async () => {
    await syncQuestRenderModel(platform, resolveOptions({ viroRendererOverlay: true }));
    expect(read('quest')).toContain('RENDER_MODEL');
    await syncQuestRenderModel(platform, resolveOptions({ viroRendererOverlay: false }));
    const quest = read('quest');
    expect(quest).not.toContain('RENDER_MODEL');
    expect(quest).toContain('android.hardware.vr.headtracking');
  });

  test('creates no quest manifest when the overlay is off', async () => {
    fs.rmSync(manifest('quest'));
    await syncQuestRenderModel(platform, resolveOptions({}));
    expect(fs.existsSync(manifest('quest'))).toBe(false);
  });

  test('pure helper adds, dedupes and removes', () => {
    const m = {
      manifest: {
        $: {},
        'uses-permission': [{ $: { 'android:name': PERMISSION } }],
        'uses-feature': [{ $: { 'android:name': FEATURE, 'android:required': 'true' } }],
      },
    } as never as Parameters<typeof applyQuestRenderModelEntries>[0];
    expect(applyQuestRenderModelEntries(m, true)).toBe(true);
    expect(m.manifest['uses-permission']).toHaveLength(1);
    expect(m.manifest['uses-feature']).toEqual([
      { $: { 'android:name': FEATURE, 'android:required': 'false' } },
    ]);
    expect(applyQuestRenderModelEntries(m, true)).toBe(false);
    expect(applyQuestRenderModelEntries(m, false)).toBe(true);
    expect(m.manifest['uses-permission']).toBeUndefined();
    expect(m.manifest['uses-feature']).toBeUndefined();
  });

  test('runs as a finalized mod, after a dangerous mod that rewrites quest', async () => {
    type Mods = Record<string, (c: unknown) => Promise<unknown>>;
    let config = { name: 'x', slug: 'x' } as { mods?: { android?: Mods } };
    config = withHorizonQuest(config as never, { viroRendererOverlay: true }) as typeof config;
    const finalized = config.mods?.android?.finalized;
    expect(typeof finalized).toBe('function');
    // Simulate expo-horizon-core's dangerous rewrite, then the finalized phase.
    put(manifest('quest'), HORIZON_QUEST);
    await finalized!({
      ...config,
      modResults: {},
      modRequest: { platform: 'android', projectRoot: root, platformProjectRoot: platform },
    });
    expect(count(read('quest'), PERMISSION)).toBe(1);
  });
});

describe('Meta Store default device targets in the quest manifest', () => {
  const META = 'com.meta.store.defaultDeviceTargets';
  const horizonQuest = (devices: string) =>
    [
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
      '  <uses-feature android:name="android.hardware.vr.headtracking" android:required="true"/>',
      '  <application>',
      `    <meta-data android:name="com.oculus.supportedDevices" android:value="${devices}"/>`,
      '  </application>',
      '</manifest>',
    ].join('\n');
  const EMPTY = '<manifest xmlns:android="http://schemas.android.com/apk/res/android"/>';
  const manifest = (flavor: string) => target(`${flavor}/AndroidManifest.xml`);
  const read = (flavor: string) => fs.readFileSync(manifest(flavor), 'utf8');
  const count = (xml: string) => xml.split(`android:name="${META}"`).length - 1;
  const valueOf = (xml: string) =>
    xml.match(new RegExp(`android:name="${META}" android:value="([^"]*)"`))?.[1];

  beforeEach(() => {
    put(manifest('quest'), horizonQuest('quest3|quest3s'));
    for (const flavor of ['pico', 'main', 'mobile', 'dual']) put(manifest(flavor), EMPTY);
  });

  test('writes quest3+ into the quest <application> only', async () => {
    await syncQuestStoreDeviceTargets(platform, resolveOptions({}));
    const quest = read('quest');
    expect(count(quest)).toBe(1);
    expect(valueOf(quest)).toBe('quest3+');
    expect(quest).toMatch(/<application>[\s\S]*defaultDeviceTargets[\s\S]*<\/application>/);
    expect(quest).toContain('android:value="quest3|quest3s"');
    for (const flavor of ['pico', 'main', 'mobile', 'dual']) expect(read(flavor)).toBe(EMPTY);
  });

  test('an explicit value wins over the derived one', async () => {
    await syncQuestStoreDeviceTargets(
      platform,
      resolveOptions({ storeDeviceTargets: 'quest3only|questpro+' })
    );
    expect(valueOf(read('quest'))).toBe('quest3only|questpro+');
  });

  test('is idempotent', async () => {
    const options = resolveOptions({ storeDeviceTargets: 'quest3+' });
    await syncQuestStoreDeviceTargets(platform, options);
    const first = read('quest');
    const mtime = fs.statSync(manifest('quest')).mtimeMs;
    await syncQuestStoreDeviceTargets(platform, options);
    expect(read('quest')).toBe(first);
    expect(fs.statSync(manifest('quest')).mtimeMs).toBe(mtime);
    expect(count(first)).toBe(1);
  });

  test.each([
    ['false', false as const],
    ['an empty string', ''],
  ])('setting it to %s removes a stale entry', async (_, storeDeviceTargets) => {
    await syncQuestStoreDeviceTargets(platform, resolveOptions({}));
    expect(count(read('quest'))).toBe(1);
    await syncQuestStoreDeviceTargets(platform, resolveOptions({ storeDeviceTargets }));
    const quest = read('quest');
    expect(count(quest)).toBe(0);
    expect(quest).toContain('com.oculus.supportedDevices');
  });

  test('never creates a quest manifest', async () => {
    fs.rmSync(manifest('quest'));
    await syncQuestStoreDeviceTargets(platform, resolveOptions({ storeDeviceTargets: 'quest3+' }));
    expect(fs.existsSync(manifest('quest'))).toBe(false);
  });

  test.each([
    ['quest3|quest3s', 'quest3+'],
    ['quest3s', 'quest3+'],
    ['questpro|quest3', 'questpro+'],
    ['quest2|quest3', 'quest2+'],
    ['quest3|quest3s|vrglasses', 'quest3+'],
    ['vrglasses', 'quest3+'],
    ['questpro|vrglasses', 'questpro+'],
    ['eureka', null],
    [null, null],
  ])('derives %s -> %s', (devices, expected) => {
    expect(deriveStoreDeviceTargets(devices)).toBe(expected);
  });

  test('a supportedDevices list with no Quest headset writes nothing and warns', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    put(manifest('quest'), horizonQuest('eureka'));
    await syncQuestStoreDeviceTargets(platform, resolveOptions({}));
    expect(count(read('quest'))).toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('eureka'));
    warn.mockRestore();
  });

  test('never adds an <application> to a quest manifest without one', async () => {
    put(manifest('quest'), EMPTY);
    await syncQuestStoreDeviceTargets(platform, resolveOptions({ storeDeviceTargets: 'quest3+' }));
    expect(read('quest')).toBe(EMPTY);
  });

  test.each(['quest3', 'quest3+|vrglasses', 'quest3+|', 'Quest3+'])(
    'rejects %j with the documented specifier list',
    (storeDeviceTargets) => {
      expect(() => resolveOptions({ storeDeviceTargets })).toThrow(
        /storeDeviceTargets has unknown specifier.*quest2only, questproonly, quest3only, quest2\+, questpro\+, quest3\+, questpro-/
      );
    }
  );

  test('normalizes whitespace and duplicates', () => {
    expect(normalizeStoreDeviceTargets(' quest3+ | quest3+ |questpro- ')).toBe('quest3+|questpro-');
    expect(normalizeStoreDeviceTargets(undefined)).toBeNull();
    expect(normalizeStoreDeviceTargets('  ')).toBe(false);
  });

  test('runs as a finalized mod, after a dangerous mod that rewrites quest', async () => {
    type Mods = Record<string, (c: unknown) => Promise<unknown>>;
    let config = { name: 'x', slug: 'x' } as { mods?: { android?: Mods } };
    config = withHorizonQuest(config as never, {}) as typeof config;
    const finalized = config.mods?.android?.finalized;
    expect(typeof finalized).toBe('function');
    put(manifest('quest'), horizonQuest('quest3|quest3s'));
    await finalized!({
      ...config,
      modResults: {},
      modRequest: { platform: 'android', projectRoot: root, platformProjectRoot: platform },
    });
    expect(valueOf(read('quest'))).toBe('quest3+');
  });
});
