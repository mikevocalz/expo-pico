import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveOptions } from '../plugin/src/types';
import {
  syncPicoOverlays,
  withPicoOpenXrLoaderOverlay,
} from '../plugin/src/withPicoOpenXrLoaderOverlay';
import {
  applyQuestRenderModelEntries,
  syncQuestRenderModel,
} from '../plugin/src/withQuestRenderModel';
import {
  deriveStoreDeviceTargets,
  normalizeStoreDeviceTargets,
  syncQuestStoreDeviceTargets,
} from '../plugin/src/withQuestStoreDeviceTargets';
import {
  renderFlavorBlock,
  updateOverlayPackaging,
  withPicoProjectBuildGradle,
} from '../plugin/src/withPicoGradle';

let root: string;
let platform: string;
let staged: string;
const loader = 'jniLibs/arm64-v8a/libopenxr_loader.so';
const renderer = 'jniLibs/arm64-v8a/libviro_renderer.so';
function put(file: string, data: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}
function target(relative: string) {
  return path.join(platform, 'app/src', relative);
}
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-pico-'));
  platform = path.join(root, 'android');
  staged = path.join(root, 'staged');
  put(path.join(staged, loader), 'LOAD');
  put(path.join(staged, renderer), 'VIRO');
  put(path.join(staged, 'androidAssets/controller_neutral.glb'), 'MESH');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

test('dual flavor loader overrides stay out of mobile and Quest source sets', () => {
  syncPicoOverlays(
    platform,
    resolveOptions({ buildVariant: 'dual', viroRendererOverlay: true }),
    staged
  );
  for (const flavor of ['pico', 'dual']) {
    expect(fs.readFileSync(target(`${flavor}/${loader}`), 'utf8')).toBe('LOAD');
    expect(fs.existsSync(target(`${flavor}/assets/controller_neutral.glb`))).toBe(true);
  }
  for (const flavor of ['main', 'quest', 'mobile'])
    expect(fs.existsSync(target(`${flavor}/${loader}`))).toBe(false);
});

describe('renderer overlay in the quest flavor', () => {
  const glb = 'assets/controller_neutral.glb';
  const state = () =>
    JSON.parse(fs.readFileSync(path.join(platform, 'app/src/.expo-pico-overlays.json'), 'utf8'));

  test.each(['pico', 'dual'] as const)(
    'buildVariant %s stages the renderer and controller mesh into quest, not the loader',
    (buildVariant) => {
      syncPicoOverlays(
        platform,
        resolveOptions({ buildVariant, viroRendererOverlay: true }),
        staged
      );
      expect(fs.readFileSync(target(`quest/${renderer}`), 'utf8')).toBe('VIRO');
      expect(fs.readFileSync(target(`quest/${glb}`), 'utf8')).toBe('MESH');
      expect(fs.existsSync(target(`quest/${loader}`))).toBe(false);
      expect(fs.readFileSync(target(`pico/${loader}`), 'utf8')).toBe('LOAD');
      for (const flavor of ['main', 'mobile']) {
        expect(fs.existsSync(target(flavor))).toBe(false);
      }
      expect(Object.keys(state()).filter((k) => k.startsWith('quest/'))).toEqual([
        path.join('quest', renderer),
        path.join('quest', glb),
      ]);
    }
  );

  test('writes only jniLibs and assets into quest', () => {
    syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged);
    expect(fs.readdirSync(target('quest')).sort()).toEqual(['assets', 'jniLibs']);
  });

  test('a mobile buildVariant stages nothing, even with xrMode and the option set', () => {
    syncPicoOverlays(
      platform,
      resolveOptions({ buildVariant: 'mobile', xrMode: 'pico-os5', viroRendererOverlay: true }),
      staged
    );
    for (const flavor of ['main', 'mobile', 'pico', 'dual', 'quest']) {
      expect(fs.existsSync(target(flavor))).toBe(false);
    }
    expect(state()).toEqual({});
  });

  test('turning the overlay off removes the quest copies and their state', () => {
    syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged);
    syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: false }), staged);
    expect(fs.existsSync(target(`quest/${renderer}`))).toBe(false);
    expect(fs.existsSync(target(`quest/${glb}`))).toBe(false);
    expect(Object.keys(state()).some((k) => k.startsWith('quest/'))).toBe(false);
    // The loader overlay is independent and stays in pico.
    expect(fs.readFileSync(target(`pico/${loader}`), 'utf8')).toBe('LOAD');
  });

  test('switching to a mobile buildVariant removes the quest copies', () => {
    syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged);
    syncPicoOverlays(platform, resolveOptions({ buildVariant: 'mobile' }), staged);
    expect(fs.existsSync(target(`quest/${renderer}`))).toBe(false);
    expect(state()).toEqual({});
  });

  test('a copy matching the staged file is removed even with the state file gone', () => {
    put(target(`quest/${renderer}`), 'VIRO');
    syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: false }), staged);
    expect(fs.existsSync(target(`quest/${renderer}`))).toBe(false);
  });

  test('is idempotent', () => {
    const options = resolveOptions({ buildVariant: 'dual', viroRendererOverlay: true });
    syncPicoOverlays(platform, options, staged);
    const first = state();
    const mtime = fs.statSync(target(`quest/${renderer}`)).mtimeMs;
    syncPicoOverlays(platform, options, staged);
    expect(state()).toEqual(first);
    expect(fs.statSync(target(`quest/${renderer}`)).mtimeMs).toBe(mtime);
    expect(fs.readFileSync(target(`quest/${renderer}`), 'utf8')).toBe('VIRO');
  });

  test('a user loader in quest is left alone', () => {
    put(target(`quest/${loader}`), 'USER');
    syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged);
    expect(fs.readFileSync(target(`quest/${loader}`), 'utf8')).toBe('USER');
  });

  test.each([
    ['the overlay is off', { viroRendererOverlay: false }],
    ['the buildVariant is mobile', { buildVariant: 'mobile' as const }],
  ])('a user renderer and mesh in quest are kept when %s', (_, overrides) => {
    put(target(`quest/${renderer}`), 'USER');
    put(target(`quest/${glb}`), 'USERMESH');
    syncPicoOverlays(platform, resolveOptions(overrides), staged);
    expect(fs.readFileSync(target(`quest/${renderer}`), 'utf8')).toBe('USER');
    expect(fs.readFileSync(target(`quest/${glb}`), 'utf8')).toBe('USERMESH');
    expect(Object.keys(state()).some((k) => k.startsWith('quest/'))).toBe(false);
  });

  test('a recorded quest copy the user edited still stops prebuild', () => {
    syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged);
    put(target(`quest/${renderer}`), 'EDIT');
    expect(() =>
      syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: false }), staged)
    ).toThrow('Review custom native override');
    expect(fs.readFileSync(target(`quest/${renderer}`), 'utf8')).toBe('EDIT');
  });

  test('a user renderer in quest stops prebuild without being modified', () => {
    put(target(`quest/${renderer}`), 'USER');
    expect(() =>
      syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged)
    ).toThrow('Review custom native override');
    expect(fs.readFileSync(target(`quest/${renderer}`), 'utf8')).toBe('USER');
  });
});

test('same-size source updates replace previously managed output', () => {
  const options = resolveOptions({});
  syncPicoOverlays(platform, options, staged);
  put(path.join(staged, loader), 'NEW!');
  syncPicoOverlays(platform, options, staged);
  expect(fs.readFileSync(target(`pico/${loader}`), 'utf8')).toBe('NEW!');
});

test('paired AAR mode cleans known legacy and flavor overlays', () => {
  put(target(`main/${loader}`), 'LOAD');
  syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged);
  expect(fs.existsSync(target(`main/${loader}`))).toBe(false);
  syncPicoOverlays(
    platform,
    resolveOptions({ openXrLoaderOverlay: false, viroRendererOverlay: false }),
    staged
  );
  expect(fs.existsSync(target(`pico/${loader}`))).toBe(false);
  expect(fs.existsSync(target(`pico/${renderer}`))).toBe(false);
  expect(fs.existsSync(target('pico/assets/controller_neutral.glb'))).toBe(false);
});

test('unknown native overrides are preserved with an actionable error', () => {
  put(target(`main/${loader}`), 'USER');
  expect(() => syncPicoOverlays(platform, resolveOptions({}), staged)).toThrow(
    'Review custom native override'
  );
  expect(fs.readFileSync(target(`main/${loader}`), 'utf8')).toBe('USER');
});

test('requested but missing staged arm64 loader fails prebuild', () => {
  fs.unlinkSync(path.join(staged, loader));
  expect(() => syncPicoOverlays(platform, resolveOptions({}), staged)).toThrow('Missing staged');
});

test('PICO resolves Horizon mobile, and dual resolves PICO before mobile', () => {
  const block = renderFlavorBlock(resolveOptions({ buildVariant: 'dual' }));
  expect(block).toMatch(/pico \{[\s\S]*?matchingFallbacks = \['mobile'\]/);
  expect(block).toContain("matchingFallbacks = ['pico', 'mobile']");
});

// Drive the real `projectBuildGradle` mod. `withProjectBuildGradle` only parks
// the callback on `config.mods.android`, so we can invoke it against an
// in-memory build.gradle without the rest of the @expo/config-plugins pipeline.
type ProjectMod = (config: unknown) => Promise<{ modResults: { contents: string } }>;
const BARE_PROJECT_GRADLE =
  'buildscript {\n    ext {\n        minSdkVersion = 24\n    }\n}\n\nallprojects {\n    repositories {\n    }\n}\n';
async function renderProjectGradle(options: unknown, contents = BARE_PROJECT_GRADLE) {
  const config = withPicoProjectBuildGradle(
    { name: 'pico', slug: 'pico' } as never,
    options as never
  ) as unknown as { mods: { android: { projectBuildGradle: ProjectMod } } };
  const applied = await config.mods.android.projectBuildGradle({
    modRequest: { nextMod: (result: unknown) => result },
    modResults: { contents, language: 'groovy' },
  });
  return applied.modResults.contents;
}

test('subprojects fallback declares the missing device dimension, never a flavor fallback', async () => {
  const generated = await renderProjectGradle(resolveOptions({ xrMode: 'pico-os5' }));
  const block = generated.slice(generated.indexOf('subprojects { sub ->'));
  expect(block).toContain("missingDimensionStrategy 'device', 'mobile'");
  // `matchingFallbacks` is declared on AGP's ProductFlavor, not on
  // DefaultConfig/BaseFlavor — emitting it here fails every autolinked
  // com.android.library at configuration time.
  expect(block).not.toContain('matchingFallbacks');
  expect(generated).toContain('// expo-pico-core: subprojects missing-dim fallback');
});

test('missing-dimension fallback is skipped for mobile while Horizon compatibility remains', async () => {
  const mobile = await renderProjectGradle(resolveOptions({ xrMode: 'mobile' }));
  expect(mobile).not.toContain('// expo-pico-core: subprojects missing-dim fallback');
  expect(mobile).toContain('// expo-pico-core: Expo Horizon AGP 9 BuildConfig compatibility');
  expect(mobile).toContain('sub.name == "expo-horizon-core"');

  const options = resolveOptions({ xrMode: 'pico-os5' });
  const once = await renderProjectGradle(options);
  expect(await renderProjectGradle(options, once)).toBe(once);
});

test('packaging migrates global override, is idempotent, and removes disabled overrides', () => {
  const old =
    'android {\n    // expo-pico-core: 16KB openxr loader overlay\n    packagingOptions {\n        jniLibs {\n            pickFirsts += ["**/libopenxr_loader.so"]\n        }\n    }\n}';
  const options = resolveOptions({ viroRendererOverlay: true });
  const generated = updateOverlayPackaging(old, options);
  expect(generated).not.toContain('packagingOptions');
  expect(generated).toContain('it.second in ["pico", "dual"]');
  expect(generated).toContain('**/libviro_renderer.so');
  expect(updateOverlayPackaging(generated, options)).toBe(generated);
  expect(
    updateOverlayPackaging(generated, resolveOptions({ openXrLoaderOverlay: false }))
  ).not.toContain('pickFirsts');
});

test('packaging lets the renderer overlay win in quest, and only the renderer', () => {
  const both = updateOverlayPackaging('', resolveOptions({ viroRendererOverlay: true }));
  const quest = both.slice(both.indexOf('it.second == "quest"'));
  expect(quest).toContain('pickFirsts.addAll(["**/libviro_renderer.so"])');
  expect(quest).not.toContain('libopenxr_loader.so');
  expect(both).not.toContain('"mobile"');

  const loaderOnly = updateOverlayPackaging('', resolveOptions({}));
  expect(loaderOnly).toContain('**/libopenxr_loader.so');
  expect(loaderOnly).not.toContain('"quest"');

  const rendererOnly = updateOverlayPackaging(
    '',
    resolveOptions({ openXrLoaderOverlay: false, viroRendererOverlay: true })
  );
  expect(rendererOnly).not.toContain('libopenxr_loader.so');
  expect(rendererOnly).toContain('it.second == "quest"');

  expect(
    updateOverlayPackaging(
      '',
      resolveOptions({ buildVariant: 'mobile', xrMode: 'pico-os5', viroRendererOverlay: true })
    )
  ).toBe('');

  for (const options of [resolveOptions({ viroRendererOverlay: true }), resolveOptions({})]) {
    const once = updateOverlayPackaging('android {}\n', options);
    expect(updateOverlayPackaging(once, options)).toBe(once);
  }
});

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

  test.each(['pico', 'dual'] as const)(
    'buildVariant %s with the overlay on adds both entries to quest only',
    async (buildVariant) => {
      await syncQuestRenderModel(
        platform,
        resolveOptions({ buildVariant, viroRendererOverlay: true })
      );
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
    }
  );

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

  test.each([
    ['the overlay is off', { viroRendererOverlay: false }],
    ['the buildVariant is mobile', { buildVariant: 'mobile' as const, viroRendererOverlay: true }],
    ['xrMode is mobile', { xrMode: 'mobile' as const, viroRendererOverlay: true }],
  ])('removes a stale copy when %s', async (_, overrides) => {
    await syncQuestRenderModel(platform, resolveOptions({ viroRendererOverlay: true }));
    expect(read('quest')).toContain('RENDER_MODEL');
    await syncQuestRenderModel(platform, resolveOptions(overrides));
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
    config = withPicoOpenXrLoaderOverlay(
      config as never,
      resolveOptions({ viroRendererOverlay: true })
    ) as typeof config;
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

  test.each(['pico', 'dual', 'mobile'] as const)(
    'buildVariant %s writes quest3+ into the quest <application> only',
    async (buildVariant) => {
      await syncQuestStoreDeviceTargets(platform, resolveOptions({ buildVariant }));
      const quest = read('quest');
      expect(count(quest)).toBe(1);
      expect(valueOf(quest)).toBe('quest3+');
      expect(quest).toMatch(/<application>[\s\S]*defaultDeviceTargets[\s\S]*<\/application>/);
      expect(quest).toContain('android:value="quest3|quest3s"');
      for (const flavor of ['pico', 'main', 'mobile', 'dual']) expect(read(flavor)).toBe(EMPTY);
    }
  );

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
    ['vrglasses', null],
    [null, null],
  ])('derives %s -> %s', (devices, expected) => {
    expect(deriveStoreDeviceTargets(devices)).toBe(expected);
  });

  test('a supportedDevices list with no Quest headset writes nothing and warns', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    put(manifest('quest'), horizonQuest('vrglasses'));
    await syncQuestStoreDeviceTargets(platform, resolveOptions({}));
    expect(count(read('quest'))).toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('vrglasses'));
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
    config = withPicoOpenXrLoaderOverlay(config as never, resolveOptions({})) as typeof config;
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
