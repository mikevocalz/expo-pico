import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedPicoOptions } from './types';

/**
 * Overlay a 16KB-page-aligned `libopenxr_loader.so` into the app's
 * `android/app/src/main/jniLibs/{arm64-v8a,armeabi-v7a}/` so it wins over the
 * legacy 4KB-aligned copy that `@reactvision/react-viro@2.56.0` (and any
 * other consumer of an old Khronos OpenXR loader AAR) ships in its native
 * libraries.
 *
 * Why:
 *   PICO OS 6 / Android 14+ rejects .so files whose PT_LOAD segments are
 *   not 16KB-aligned. The legacy Khronos `openxr_loader_for_android` 1.1.38
 *   that Viro bundles is 4KB-aligned and causes a silent native-load
 *   failure on PICO 4 Ultra / Quest 3S devices. We carry an in-tree copy
 *   of Khronos 1.1.62 (which IS 16KB-aligned) and Gradle's `pickFirst`
 *   strategy (added by `withPicoQuestFlavor`) ensures the app's own
 *   `jniLibs` copy wins over the AAR's.
 *
 * Sources:
 *   `plugin/assets/jniLibs/{abi}/libopenxr_loader.so` (committed in this package).
 *
 * Verified with `scripts/verify-16kb-alignment.py` against the built APK.
 *
 * Idempotent: skips the copy when the destination already exists and has
 * the same size as the staged loader.
 */
export const withPicoOpenXrLoaderOverlay: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  if (options.xrMode === 'mobile') {
    return config;
  }

  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const platformRoot = cfg.modRequest.platformProjectRoot;
      const stagedRoot = path.resolve(__dirname, '../assets/jniLibs');

      const libraries: string[] = ['libopenxr_loader.so'];
      if (options.viroRendererOverlay) {
        libraries.push('libviro_renderer.so');
      }

      for (const abi of ['arm64-v8a', 'armeabi-v7a'] as const) {
        for (const library of libraries) {
          const src = path.join(stagedRoot, abi, library);
          if (!fs.existsSync(src)) {
            // Not staged for this ABI. Expected for libviro_renderer.so, which
            // is only carried for arm64-v8a — PICO ships no 32-bit device — and
            // for a source checkout with no staged assets at all. Silent: the
            // alignment gate catches a genuinely missing loader downstream.
            continue;
          }
          const destDir = path.join(platformRoot, 'app/src/main/jniLibs', abi);
          const dest = path.join(destDir, library);
          fs.mkdirSync(destDir, { recursive: true });

          if (fs.existsSync(dest)) {
            const a = fs.statSync(src).size;
            const b = fs.statSync(dest).size;
            if (a === b) continue;
          }
          fs.copyFileSync(src, dest);
        }
      }

      void projectRoot;
      return cfg;
    },
  ]);
};
