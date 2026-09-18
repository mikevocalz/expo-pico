import fs from 'fs';
import os from 'os';
import path from 'path';

import { resolveOptions } from '../plugin/src/types';
import { syncPicoOverlays } from '../plugin/src/withPicoOpenXrLoaderOverlay';

/**
 * PICO ships no 32-bit device, and `scripts/verify-16kb-alignment.py` reads
 * 64-bit ELF only (`--abi` accepts `arm64-v8a` / `x86_64`, and a 32-bit file
 * fails with "expected ELF64"). A staged `armeabi-v7a` binary is therefore
 * one nothing in this repo can check — and `ndkAbiFilters: false` is a
 * supported option, so the Gradle ABI filter is not a guarantee it stays out
 * of the APK.
 */

const ASSET_ROOT = path.resolve(__dirname, '..', 'plugin', 'assets', 'jniLibs');
const loader = path.join('jniLibs', 'arm64-v8a', 'libopenxr_loader.so');

let root: string;
let platform: string;
let staged: string;

function put(file: string, data: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-pico-abi-'));
  platform = path.join(root, 'android');
  staged = path.join(root, 'staged');
  put(path.join(staged, loader), 'LOAD64');
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe('overlay staging is arm64-v8a only', () => {
  it('ignores a 32-bit loader sitting under the staged root', () => {
    put(path.join(staged, 'jniLibs/armeabi-v7a/libopenxr_loader.so'), 'LOAD32');
    syncPicoOverlays(platform, resolveOptions({ buildVariant: 'dual' }), staged);
    for (const flavor of ['main', 'mobile', 'pico', 'dual', 'quest']) {
      expect(
        fs.existsSync(path.join(platform, 'app/src', flavor, 'jniLibs/armeabi-v7a'))
      ).toBe(false);
    }
    expect(fs.readFileSync(path.join(platform, 'app/src/pico', loader), 'utf8')).toBe('LOAD64');
  });

  it('removes a 32-bit loader an earlier prebuild staged', () => {
    const managed = path.join(platform, 'app/src/pico/jniLibs/armeabi-v7a/libopenxr_loader.so');
    put(managed, 'LOAD32');
    put(
      path.join(platform, 'app/src/.expo-pico-overlays.json'),
      JSON.stringify({
        'pico/jniLibs/armeabi-v7a/libopenxr_loader.so': require('crypto')
          .createHash('sha256')
          .update('LOAD32')
          .digest('hex'),
      })
    );
    syncPicoOverlays(platform, resolveOptions({}), staged);
    expect(fs.existsSync(managed)).toBe(false);
  });

  it('ships no non-arm64 ABI directory in the plugin assets', () => {
    expect(fs.readdirSync(ASSET_ROOT).filter((e) => e.includes('-'))).toEqual(['arm64-v8a']);
  });
});
