import { AndroidConfig, compileModsAsync } from '@expo/config-plugins';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  applyOneLauncherTileGradle,
  assertAtMostOneLauncherTile,
  launcherVisibleActivities,
  MAIN_ACTION,
  VIRO_VR_ACTION,
} from '../plugin/src/launcherTiles';
import { resolveOptions } from '../plugin/src/types';
import { withPicoAndroidManifest } from '../plugin/src/withPicoAndroidManifest';
import { withPicoOneLauncherTile } from '../plugin/src/withPicoOneLauncherTile';
import { applyVRActivityContract } from '../plugin/src/withPicoVRActivity';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

const PACKAGE = 'com.example.picoapp';

const LAUNCHER_ACTIVITY = `    <activity android:name=".MainActivity" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
    </activity>`;

// What @reactvision/react-viro writes once it stops using MAIN.
const VIRO_VR_ACTIVITY = `    <activity android:name=".VRActivity" android:exported="false">
      <intent-filter>
        <action android:name="com.viro.intent.action.VR"/>
        <category android:name="com.oculus.intent.category.VR"/>
      </intent-filter>
    </activity>`;

// What every published @reactvision/react-viro (2.58 to 3.0.x) writes.
const PUBLISHED_VIRO_VR_ACTIVITY = `    <activity android:name=".VRActivity" android:exported="false">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="com.oculus.intent.category.VR"/>
      </intent-filter>
    </activity>`;

const manifestXml = (
  activities: string
) => `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
${activities}
  </application>
</manifest>
`;

// The PICO overlay this plugin wrote before the fix.
const LEGACY_PICO_MANIFEST = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">
  <application>
    <activity android:name=".VRActivity" tools:node="merge">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="com.pico.intent.category.VR"/>
        <category android:name="com.picovr.intent.category.VR"/>
        <category android:name="org.khronos.openxr.intent.category.IMMERSIVE_HMD"/>
      </intent-filter>
    </activity>
  </application>
</manifest>
`;

const tempRoots: string[] = [];

function makeProject(mainManifest: string, flavors: Record<string, string> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pico-one-tile-'));
  tempRoots.push(root);
  const app = path.join(root, 'android', 'app');
  fs.mkdirSync(path.join(app, 'src', 'main'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture' }));
  fs.writeFileSync(path.join(app, 'src', 'main', 'AndroidManifest.xml'), mainManifest);
  fs.writeFileSync(path.join(app, 'build.gradle'), 'android {\n}\n');
  for (const [flavor, xml] of Object.entries(flavors)) {
    fs.mkdirSync(path.join(app, 'src', flavor), { recursive: true });
    fs.writeFileSync(path.join(app, 'src', flavor, 'AndroidManifest.xml'), xml);
  }
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
});

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

async function prebuild(root: string, appType: 'vr' | 'mr' = 'vr') {
  const options = resolveOptions({ appType, buildVariant: 'pico' } as any);
  let config: any = {
    name: 'fixture',
    slug: 'fixture',
    android: { package: PACKAGE },
    _internal: { projectRoot: root },
  };
  // Same order as withPico: the guard is registered first so it runs last.
  config = withPicoOneLauncherTile(config);
  config = withPicoAndroidManifest(config, options);
  await compileModsAsync(config, {
    projectRoot: root,
    platforms: ['android'],
    assertMissingModProviders: false,
  });
}

const read = (root: string, flavor: string): Promise<Manifest> =>
  AndroidConfig.Manifest.readAndroidManifestAsync(
    path.join(root, 'android', 'app', 'src', flavor, 'AndroidManifest.xml')
  );

const vrActivity = (m: Manifest): any =>
  (m.manifest.application?.[0]?.activity ?? []).find(
    (a: any) => a.$['android:name'] === '.VRActivity'
  );

const appGradle = (root: string) =>
  fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');

describe('VRActivity in the PICO overlay', () => {
  test('fresh prebuild: VRActivity drops every intent-filter, one tile in the pico variant', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${VIRO_VR_ACTIVITY}`));
    await prebuild(root);
    const main = await read(root, 'main');
    const pico = await read(root, 'pico');
    expect(vrActivity(pico)['intent-filter']).toEqual([{ $: { 'tools:node': 'removeAll' } }]);
    expect(launcherVisibleActivities(main, pico)).toEqual(['.MainActivity']);
  });

  test('published Viro: MAIN on .VRActivity in main becomes the Viro VR action', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${PUBLISHED_VIRO_VR_ACTIVITY}`));
    await prebuild(root);
    const main = await read(root, 'main');
    const filters = vrActivity(main)['intent-filter'];
    expect(filters).toHaveLength(1);
    expect(filters[0].action.map((a: any) => a.$['android:name'])).toEqual([VIRO_VR_ACTION]);
    expect(filters[0].category.map((c: any) => c.$['android:name'])).toEqual([
      'com.oculus.intent.category.VR',
    ]);
    expect(launcherVisibleActivities(main)).toEqual(['.MainActivity']);
  });

  test('a second prebuild changes nothing', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${VIRO_VR_ACTIVITY}`));
    await prebuild(root);
    const picoPath = path.join(root, 'android', 'app', 'src', 'pico', 'AndroidManifest.xml');
    const firstPico = fs.readFileSync(picoPath, 'utf8');
    const firstGradle = appGradle(root);
    await prebuild(root);
    expect(fs.readFileSync(picoPath, 'utf8')).toBe(firstPico);
    expect(appGradle(root)).toBe(firstGradle);
    expect(appGradle(root).match(/one-launcher-tile\.gradle/g)).toHaveLength(1);
  });

  test('replaces the MAIN filter an older version wrote to the PICO overlay', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${VIRO_VR_ACTIVITY}`), {
      pico: LEGACY_PICO_MANIFEST,
    });
    await prebuild(root);
    const pico = await read(root, 'pico');
    const actions = (vrActivity(pico)['intent-filter'] ?? []).flatMap((f: any) =>
      (f.action ?? []).map((a: any) => a.$['android:name'])
    );
    expect(actions).not.toContain(MAIN_ACTION);
  });

  test('applyVRActivityContract replaces an existing MAIN filter and is idempotent', () => {
    const manifest = {
      manifest: {
        $: {},
        application: [
          {
            $: {},
            activity: [
              {
                $: { 'android:name': '.VRActivity', 'tools:node': 'merge' },
                'intent-filter': [
                  {
                    action: [{ $: { 'android:name': MAIN_ACTION } }],
                    category: [{ $: { 'android:name': 'com.pico.intent.category.VR' } }],
                  },
                ],
              },
            ],
          },
        ],
      },
    } as unknown as Manifest;
    const options = resolveOptions({ appType: 'mr', buildVariant: 'pico' } as any);
    applyVRActivityContract(manifest, options);
    const once = JSON.stringify(manifest);
    applyVRActivityContract(manifest, options);
    expect(JSON.stringify(manifest)).toBe(once);
    expect(vrActivity(manifest)['intent-filter']).toEqual([{ $: { 'tools:node': 'removeAll' } }]);
  });

  test('applies the merged-manifest Gradle check from app/build.gradle', async () => {
    const root = makeProject(manifestXml(LAUNCHER_ACTIVITY));
    await prebuild(root);
    expect(appGradle(root)).toMatch(/apply from: ".*\/android\/one-launcher-tile\.gradle"\n$/);
  });
});

describe('the prebuild fails on two tiles', () => {
  test('two launcher activities in main', async () => {
    const second = LAUNCHER_ACTIVITY.replace('.MainActivity', '.OtherActivity');
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${second}`));
    await expect(prebuild(root)).rejects.toThrow(
      /\[one-launcher-tile\] app\/src\/main\/AndroidManifest\.xml declares 2 launcher-visible activities \(\.MainActivity, \.OtherActivity\)/
    );
  });

  test('another flavor manifest that gives an activity MAIN + a VR category', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${VIRO_VR_ACTIVITY}`), {
      quest: LEGACY_PICO_MANIFEST,
    });
    await expect(prebuild(root)).rejects.toThrow(
      /app\/src\/main \+ app\/src\/quest AndroidManifest\.xml declares 2 launcher-visible activities/
    );
  });
});

describe('launcher tile helpers', () => {
  const parse = (activities: any[]): Manifest =>
    ({
      manifest: { $: {}, application: [{ $: {}, activity: activities }] },
    }) as unknown as Manifest;
  const filter = (action: string, ...categories: string[]) => ({
    action: [{ $: { 'android:name': action } }],
    category: categories.map((c) => ({ $: { 'android:name': c } })),
  });

  test.each([
    'android.intent.category.LAUNCHER',
    'com.oculus.intent.category.VR',
    'com.pico.intent.category.VR',
    'com.picovr.intent.category.VR',
    'org.khronos.openxr.intent.category.IMMERSIVE_HMD',
  ])('MAIN + %s is launcher-visible', (category) => {
    const m = parse([
      { $: { 'android:name': '.A' }, 'intent-filter': [filter(MAIN_ACTION, category)] },
    ]);
    expect(launcherVisibleActivities(m)).toEqual(['.A']);
  });

  test('a removeAll intent-filter in the flavor clears the tile main gave the activity', () => {
    const main = parse([
      {
        $: { 'android:name': '.A' },
        'intent-filter': [filter(MAIN_ACTION, 'android.intent.category.LAUNCHER')],
      },
      {
        $: { 'android:name': '.VRActivity' },
        'intent-filter': [filter(MAIN_ACTION, 'com.oculus.intent.category.VR')],
      },
    ]);
    const flavor = parse([
      {
        $: { 'android:name': '.VRActivity' },
        'intent-filter': [{ $: { 'tools:node': 'removeAll' } }],
      },
    ]);
    expect(() => assertAtMostOneLauncherTile('x', main, flavor)).not.toThrow();
    expect(() => assertAtMostOneLauncherTile('x', main)).toThrow(/declares 2/);
  });

  test('applyOneLauncherTileGradle replaces a stale path', () => {
    const first = applyOneLauncherTileGradle('android {}\n', '../old/one-launcher-tile.gradle');
    const second = applyOneLauncherTileGradle(first, '../new/one-launcher-tile.gradle');
    expect(second).not.toContain('../old/');
    expect(second.match(/apply from/g)).toHaveLength(1);
  });
});
