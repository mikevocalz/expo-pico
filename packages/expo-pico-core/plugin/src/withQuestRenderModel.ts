import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod as (
  config: unknown,
  args: ['android', (cfg: { modRequest: { platformProjectRoot: string } }) => unknown]
) => unknown;
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedPicoOptions } from './types';

type Manifest = AndroidConfig.Manifest.AndroidManifest;

/** Meta permission that lets an app call `xrGetRenderModelPathsFB` / `xrLoadRenderModelFB`. */
export const RENDER_MODEL_PERMISSION = 'com.oculus.permission.RENDER_MODEL';
/** Meta feature declared next to the permission; optional so the APK installs anywhere. */
export const RENDER_MODEL_FEATURE = 'com.oculus.feature.RENDER_MODEL';

/**
 * True when `syncPicoOverlays` stages `libviro_renderer.so` into the quest
 * flavor. The RENDER_MODEL entries follow the same condition.
 */
export function rendererOverlayActive(options: ResolvedPicoOptions): boolean {
  return (
    options.xrMode !== 'mobile' && options.buildVariant !== 'mobile' && options.viroRendererOverlay
  );
}

/**
 * Adds (enabled) or removes (disabled) the RENDER_MODEL permission and
 * feature in a quest flavor manifest. Every other entry is left alone.
 * Returns true when the manifest changed.
 */
export function applyQuestRenderModelEntries(manifest: Manifest, enabled: boolean): boolean {
  const before = JSON.stringify(manifest);
  const root = manifest.manifest;
  const isOurs = (e: { $?: { 'android:name'?: string } }, name: string) =>
    e.$?.['android:name'] === name;

  if (root['uses-permission']) {
    root['uses-permission'] = root['uses-permission'].filter(
      (e) => !isOurs(e, RENDER_MODEL_PERMISSION)
    );
  }
  if (root['uses-feature']) {
    root['uses-feature'] = root['uses-feature'].filter((e) => !isOurs(e, RENDER_MODEL_FEATURE));
  }
  if (enabled) {
    (root['uses-permission'] ??= []).unshift({ $: { 'android:name': RENDER_MODEL_PERMISSION } });
    (root['uses-feature'] ??= []).unshift({
      $: { 'android:name': RENDER_MODEL_FEATURE, 'android:required': 'false' },
    });
  }
  if (root['uses-permission']?.length === 0) delete root['uses-permission'];
  if (root['uses-feature']?.length === 0) delete root['uses-feature'];
  return JSON.stringify(manifest) !== before;
}

/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with the renderer
 * overlay. The file is created only when there is something to add; with the
 * overlay off an existing file loses the two entries and nothing else.
 */
export async function syncQuestRenderModel(
  platformRoot: string,
  options: ResolvedPicoOptions
): Promise<void> {
  const enabled = rendererOverlayActive(options);
  const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
  const exists = fs.existsSync(questPath);
  if (!exists && !enabled) return;
  const manifest: Manifest = exists
    ? await AndroidConfig.Manifest.readAndroidManifestAsync(questPath)
    : {
        manifest: {
          $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
          queries: [],
        },
      };
  if (!applyQuestRenderModelEntries(manifest, enabled)) return;
  if (!exists) fs.mkdirSync(path.dirname(questPath), { recursive: true });
  await AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}

/**
 * Declares Meta's RENDER_MODEL permission and feature in the quest flavor
 * manifest while the renderer overlay is staged there. The overlay renderer
 * loads the runtime's own controller models through `XR_FB_render_model`,
 * which Horizon OS gates on this permission. PICO has no such extension, so
 * pico, dual, mobile and main never get either entry.
 *
 * Runs as a finalized mod: expo-horizon-core rewrites the quest manifest from
 * scratch in a dangerous mod, and dangerous mods registered later run
 * earlier, so a dangerous mod here could be overwritten.
 */
export const withQuestRenderModel: ConfigPlugin<ResolvedPicoOptions> = (config, options) =>
  withFinalizedMod(config, [
    'android',
    async (cfg) => {
      await syncQuestRenderModel(cfg.modRequest.platformProjectRoot, options);
      return cfg;
    },
  ]) as typeof config;
