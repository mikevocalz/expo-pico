import { AndroidConfig, compileModsAsync } from '@expo/config-plugins';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  activityWindows,
  applyWindowContract,
  PANEL_ACTIVITY,
  PANEL_POSITION,
  TRANSLUCENT_MAIN_WINDOW_META,
  VR_POSITION_META,
  windowPositionProblems,
} from '../plugin/src/picoWindows';
import { resolveOptions } from '../plugin/src/types';
import type { PicoPluginOptions } from '../plugin/src/types';
import { withPicoAndroidManifest } from '../plugin/src/withPicoAndroidManifest';
import { withPicoWindowPositions } from '../plugin/src/withPicoWindowPositions';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

const PKG = path.resolve(__dirname, '..');

const LAUNCHER_ACTIVITY = `    <activity android:name=".MainActivity" android:exported="true">
      <intent-filter>
        <action android:name="android.intent.action.MAIN"/>
        <category android:name="android.intent.category.LAUNCHER"/>
      </intent-filter>
    </activity>`;

const positioned = (name: string, position: string) => `    <activity android:name="${name}">
      <meta-data android:name="pico.vr.position" android:value="${position}"/>
    </activity>`;

const manifestXml = (
  activities: string
) => `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <application android:name=".MainApplication">
${activities}
  </application>
</manifest>
`;

const tempRoots: string[] = [];

function makeProject(mainManifest: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pico-windows-'));
  tempRoots.push(root);
  const app = path.join(root, 'android', 'app');
  fs.mkdirSync(path.join(app, 'src', 'main'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: 'fixture' }));
  fs.writeFileSync(path.join(app, 'src', 'main', 'AndroidManifest.xml'), mainManifest);
  fs.writeFileSync(path.join(app, 'build.gradle'), 'android {\n}\n');
  return root;
}

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const root of tempRoots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  jest.restoreAllMocks();
});

async function prebuild(root: string, options: PicoPluginOptions = {}) {
  const resolved = resolveOptions({ appType: 'mr', buildVariant: 'pico', ...options });
  let config: any = {
    name: 'fixture',
    slug: 'fixture',
    android: { package: 'com.example.picoapp' },
    _internal: { projectRoot: root },
  };
  // Same order as withPico: the guard is registered first so it runs last.
  config = withPicoWindowPositions(config);
  config = withPicoAndroidManifest(config, resolved);
  await compileModsAsync(config, {
    projectRoot: root,
    platforms: ['android'],
    assertMissingModProviders: false,
  });
}

const readPico = (root: string): Promise<Manifest> =>
  AndroidConfig.Manifest.readAndroidManifestAsync(
    path.join(root, 'android', 'app', 'src', 'pico', 'AndroidManifest.xml')
  );

const application = (m: Manifest): any => m.manifest.application?.[0] ?? {};
const panelActivity = (m: Manifest): any =>
  (application(m).activity ?? []).find((a: any) => a.$['android:name'] === PANEL_ACTIVITY);
const translucentFlag = (m: Manifest): any =>
  (application(m)['meta-data'] ?? []).find(
    (e: any) => e.$['android:name'] === TRANSLUCENT_MAIN_WINDOW_META
  );

describe('PICO window defaults in the pico flavor manifest', () => {
  test('on by default: translucent main window flag and the panel activity', async () => {
    const root = makeProject(manifestXml(LAUNCHER_ACTIVITY));
    await prebuild(root);
    const pico = await readPico(root);
    expect(translucentFlag(pico).$['android:value']).toBe('true');
    const panel = panelActivity(pico);
    expect(panel.$['android:exported']).toBe('false');
    expect(panel['intent-filter']).toBeUndefined();
    expect(panel['meta-data']).toEqual([
      { $: { 'android:name': VR_POSITION_META, 'android:value': PANEL_POSITION } },
    ]);
  });

  test('the panel position differs from the main activity window', async () => {
    const root = makeProject(manifestXml(LAUNCHER_ACTIVITY));
    await prebuild(root);
    const main = await AndroidConfig.Manifest.readAndroidManifestAsync(
      path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml')
    );
    const windows = activityWindows(main, await readPico(root));
    expect(windows.find((w) => w.name === '.MainActivity')?.explicitPosition).toBeUndefined();
    expect(windows.find((w) => w.name === PANEL_ACTIVITY)?.explicitPosition).toBe('rail');
    expect(windowPositionProblems(windows)).toEqual([]);
  });

  test('each option opts out on its own', async () => {
    const root = makeProject(manifestXml(LAUNCHER_ACTIVITY));
    await prebuild(root, { windows: { translucentMainWindow: false } });
    let pico = await readPico(root);
    expect(translucentFlag(pico)).toBeUndefined();
    expect(panelActivity(pico)).toBeDefined();

    await prebuild(root, { windows: { panelActivity: false } });
    pico = await readPico(root);
    expect(translucentFlag(pico)).toBeDefined();
    expect(panelActivity(pico)).toBeUndefined();
  });

  test('applyWindowContract is idempotent and removes what an option turns off', () => {
    const manifest = { manifest: { $: {}, application: [{ $: {} }] } } as unknown as Manifest;
    const on = resolveOptions({});
    applyWindowContract(manifest, on);
    const once = JSON.stringify(manifest);
    applyWindowContract(manifest, on);
    expect(JSON.stringify(manifest)).toBe(once);
    applyWindowContract(
      manifest,
      resolveOptions({ windows: { translucentMainWindow: false, panelActivity: false } })
    );
    expect(translucentFlag(manifest)).toBeUndefined();
    expect(panelActivity(manifest)).toBeUndefined();
  });

  test('applies the merged-manifest Gradle check from app/build.gradle, once', async () => {
    const root = makeProject(manifestXml(LAUNCHER_ACTIVITY));
    await prebuild(root);
    await prebuild(root);
    const gradle = fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
    expect(gradle.match(/pico-window-positions\.gradle/g)).toHaveLength(1);
    expect(gradle).toMatch(/apply from: ".*\/android\/pico-window-positions\.gradle"\n$/);
  });
});

describe('the prebuild fails on a window position that breaks PICO OS 5', () => {
  test('an app activity that takes the panel position', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${positioned('.Rail', 'rail')}`));
    await expect(prebuild(root)).rejects.toThrow(
      /\.Rail sets pico\.vr\.position="rail", the same window as expo\.modules\.pico\.PicoPanelActivity/
    );
  });

  test('an activity that sets "far", the main window position', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${positioned('.Panel', 'far')}`));
    await expect(prebuild(root)).rejects.toThrow(/an activity without the key counts as "far"/);
  });

  test('an activity that uses "near"', async () => {
    const root = makeProject(manifestXml(`${LAUNCHER_ACTIVITY}\n${positioned('.Popup', 'near')}`));
    await expect(prebuild(root)).rejects.toThrow(/\.Popup sets pico\.vr\.position="near"/);
  });

  test('immersive activities and activities without the key are not reported', () => {
    expect(
      windowPositionProblems([
        { name: '.MainActivity', explicitPosition: undefined, immersive: false },
        { name: '.Settings', explicitPosition: undefined, immersive: false },
        { name: '.VRActivity', explicitPosition: 'far', immersive: true },
        { name: PANEL_ACTIVITY, explicitPosition: 'rail', immersive: false },
      ])
    ).toEqual([]);
  });
});

describe('native linking of the window listener', () => {
  test('Expo autolinking links android-expo, whose Package registers the listener', () => {
    const config = JSON.parse(fs.readFileSync(path.join(PKG, 'expo-module.config.json'), 'utf8'));
    expect(config.android.path).toBe('android-expo');
    const dir = path.join(PKG, 'android-expo/src/main/java/expo/modules/pico/window');
    const pkg = fs.readFileSync(path.join(dir, 'PicoWindowPackage.kt'), 'utf8');
    // The scan expo-modules-autolinking runs on *Package.kt files.
    expect(pkg).toMatch(/\bimport\s+expo\.modules\.core\.interfaces\.Package\b/);
    expect(pkg).toContain('listOf(PicoMainWindowListener())');
    expect(fs.readFileSync(path.join(dir, 'PicoMainWindowListener.kt'), 'utf8')).toContain(
      'override fun onContentChanged'
    );
  });

  test('the Expo project is separate from the Nitro module withPicoNitroModules includes', () => {
    const config = JSON.parse(fs.readFileSync(path.join(PKG, 'expo-module.config.json'), 'utf8'));
    // android/ is included as :expo-pico-core by withPicoNitroModules; the
    // Expo project must not point at the same directory or reuse that name.
    expect(config.android.path).not.toBe('android');
    expect(config.android.name).not.toBe('expo-pico-core');
    expect(fs.existsSync(path.join(PKG, config.android.path, 'build.gradle'))).toBe(true);
  });

  test('the listener reads the meta-data key the plugin writes', () => {
    const kt = fs.readFileSync(
      path.join(
        PKG,
        'android-expo/src/main/java/expo/modules/pico/window/Context+declaresTranslucentMainWindow.kt'
      ),
      'utf8'
    );
    expect(kt).toContain(`"${TRANSLUCENT_MAIN_WINDOW_META}"`);
  });
});
