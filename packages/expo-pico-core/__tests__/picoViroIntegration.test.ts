import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveOptions } from './support/picoOptions';
import {
  syncPicoOverlays,
  withPicoOpenXrLoaderOverlay,
} from '../plugin/src/withPicoOpenXrLoaderOverlay';
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

test('the renderer overlay never touches the quest source set', () => {
  for (const buildVariant of ['pico', 'dual'] as const) {
    syncPicoOverlays(platform, resolveOptions({ buildVariant, viroRendererOverlay: true }), staged);
    expect(fs.existsSync(target('quest'))).toBe(false);
  }
});

test('copies an older core recorded in quest are dropped from state and left in place', () => {
  put(target(`quest/${renderer}`), 'VIRO');
  put(
    target('.expo-pico-overlays.json'),
    JSON.stringify({ [path.join('quest', renderer)]: 'stale-digest' })
  );
  syncPicoOverlays(platform, resolveOptions({ viroRendererOverlay: true }), staged);
  expect(fs.readFileSync(target(`quest/${renderer}`), 'utf8')).toBe('VIRO');
  const state = JSON.parse(fs.readFileSync(target('.expo-pico-overlays.json'), 'utf8'));
  expect(Object.keys(state).some((k) => k.startsWith('quest'))).toBe(false);
});

test('PICO off stages nothing', () => {
  syncPicoOverlays(
    platform,
    resolveOptions({ picoAppId: undefined, viroRendererOverlay: true }),
    staged
  );
  expect(fs.readdirSync(target(''))).toEqual(['.expo-pico-overlays.json']);
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

test('missing-dimension fallback is skipped for mobile, and core leaves Horizon alone', async () => {
  const mobile = await renderProjectGradle(resolveOptions({ xrMode: 'mobile' }));
  expect(mobile).not.toContain('// expo-pico-core: subprojects missing-dim fallback');
  expect(mobile).not.toContain('expo-horizon-core');

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

test('packaging covers pico and dual only, never quest or mobile', () => {
  const both = updateOverlayPackaging('', resolveOptions({ viroRendererOverlay: true }));
  expect(both).toContain('it.second in ["pico", "dual"]');
  expect(both).not.toContain('"quest"');
  expect(both).not.toContain('"mobile"');
  expect(
    updateOverlayPackaging('', resolveOptions({ picoAppId: undefined, viroRendererOverlay: true }))
  ).toBe('');
  for (const options of [resolveOptions({ viroRendererOverlay: true }), resolveOptions({})]) {
    const once = updateOverlayPackaging('android {}\n', options);
    expect(updateOverlayPackaging(once, options)).toBe(once);
  }
});
