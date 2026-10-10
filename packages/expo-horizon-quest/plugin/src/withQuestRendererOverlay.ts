import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedQuestOptions } from './types';

const digest = (file: string): string =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Records the copies this plugin wrote into `app/src/quest`. */
export const QUEST_OVERLAY_STATE = '.expo-horizon-quest-overlays.json';

/** Files staged from `plugin/assets`, relative to it and to `app/src/quest`. */
const OVERLAY_FILES = [
  {
    staged: 'jniLibs/arm64-v8a/libviro_renderer.so',
    target: 'jniLibs/arm64-v8a/libviro_renderer.so',
  },
  { staged: 'androidAssets/controller_neutral.glb', target: 'assets/controller_neutral.glb' },
];

/**
 * Stages the patched Viro renderer and the controller mesh it loads into
 * `app/src/quest`, or removes the copies this plugin wrote there.
 *
 * A file at a target path is this plugin's when its state file recorded it or
 * when it is byte-for-byte the staged copy (an older @expo-pico/core wrote the
 * same files). Anything else belongs to the app: prebuild stops before
 * replacing it, and leaves it alone when the overlay is off.
 *
 * @throws when the overlay is on and a staged file is missing, or when it
 * would overwrite a file the app owns
 */
export function syncQuestRendererOverlay(
  platformRoot: string,
  options: Pick<ResolvedQuestOptions, 'viroRendererOverlay'>,
  stagedRoot = path.resolve(__dirname, '../assets')
): void {
  const questRoot = path.join(platformRoot, 'app/src/quest');
  const statePath = path.join(platformRoot, 'app/src', QUEST_OVERLAY_STATE);
  const previous: Record<string, string> = fs.existsSync(statePath)
    ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
    : {};
  const next: Record<string, string> = {};
  const enabled = options.viroRendererOverlay;

  for (const file of OVERLAY_FILES) {
    const source = path.join(stagedRoot, file.staged);
    const target = path.join(questRoot, file.target);
    if (enabled && !fs.existsSync(source)) {
      throw new Error(
        `[expo-horizon-quest] Missing staged ${file.staged}. Turn viroRendererOverlay off to use a rebuilt Viro AAR.`
      );
    }
    const sourceDigest = fs.existsSync(source) ? digest(source) : undefined;
    const current = fs.existsSync(target) ? digest(target) : undefined;
    const ours =
      current !== undefined && (current === previous[file.target] || current === sourceDigest);

    if (enabled) {
      if (current !== undefined && !ours) {
        throw new Error(
          `[expo-horizon-quest] Review custom native override ${target} before prebuild; it was not modified.`
        );
      }
      if (current !== sourceDigest) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target);
      }
      next[file.target] = sourceDigest as string;
    } else if (ours) {
      fs.unlinkSync(target);
    }
  }

  if (Object.keys(next).length > 0) {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2) + '\n');
  } else if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

/** Runs {@linkcode syncQuestRendererOverlay} during prebuild. */
export const withQuestRendererOverlay: ConfigPlugin<ResolvedQuestOptions> = (config, options) =>
  withDangerousMod(config, [
    'android',
    (cfg) => {
      syncQuestRendererOverlay(cfg.modRequest.platformProjectRoot, options);
      return cfg;
    },
  ]);
