import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveOptions } from '../plugin/src/types';
import { syncPicoOverlays } from '../plugin/src/withPicoOpenXrLoaderOverlay';
import { renderFlavorBlock, updateOverlayPackaging } from '../plugin/src/withPicoGradle';

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

test('dual flavor overrides stay out of mobile and Quest source sets', () => {
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
