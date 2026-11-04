import { AndroidConfig, ConfigPlugin } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { ResolvedQuestOptions } from './types';

// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod as (
  config: unknown,
  args: ['android', (cfg: { modRequest: { platformProjectRoot: string } }) => unknown]
) => unknown;

type Manifest = AndroidConfig.Manifest.AndroidManifest;
type Node = { $?: Record<string, string | undefined>; [key: string]: any };

/**
 * @expo-pico/core's panel activity: a second surface on the app's one
 * ReactHost, opened with `PicoWindows.createPanelHost().openPanel(...)`.
 */
export const PANEL_ACTIVITY = 'expo.modules.pico.PicoPanelActivity';

/** Meta's panel width range for a second activity panel (panel-sizing docs). */
export const PANEL_WIDTH_RANGE_DP = { min: 384, max: 1440 } as const;

/** The detail panel's size, as `"<n>dp"` strings. */
export interface QuestDetailPanelOptions {
  defaultWidth: string;
  defaultHeight: string;
}

function parseDp(field: string, value: unknown): number {
  const match = /^(\d+(?:\.\d+)?)dp$/.exec(String(value));
  if (!match) {
    throw new Error(
      `[expo-horizon-quest] detailPanel.${field} must look like "420dp", got ${JSON.stringify(
        value
      )}.`
    );
  }
  return Number(match[1]);
}

/**
 * Validates `detailPanel`. Returns null when it is unset or false.
 *
 * @throws When a size is not a dp string or the width is outside Meta's range.
 */
export function normalizeDetailPanel(
  value: QuestDetailPanelOptions | false | null | undefined
): QuestDetailPanelOptions | null {
  if (value === undefined || value === null || value === false) return null;
  const width = parseDp('defaultWidth', value.defaultWidth);
  parseDp('defaultHeight', value.defaultHeight);
  if (width < PANEL_WIDTH_RANGE_DP.min || width > PANEL_WIDTH_RANGE_DP.max) {
    throw new Error(
      `[expo-horizon-quest] detailPanel.defaultWidth ${width}dp is outside Meta's ` +
        `${PANEL_WIDTH_RANGE_DP.min}-${PANEL_WIDTH_RANGE_DP.max}dp panel range.`
    );
  }
  return { defaultWidth: value.defaultWidth, defaultHeight: value.defaultHeight };
}

/** The quest-manifest `<activity>` for the panel. Pure. */
export function panelActivityElement(size: QuestDetailPanelOptions): Node {
  return {
    $: {
      'android:name': PANEL_ACTIVITY,
      'android:exported': 'false',
      'android:theme': '@style/AppTheme',
      'android:configChanges':
        'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density',
      'android:resizeableActivity': 'true',
      'android:excludeFromRecents': 'true',
      // A task of its own, so Horizon OS opens it as its own panel beside the
      // main one instead of stacking it on the main window's task.
      'android:taskAffinity': '${applicationId}.panel',
    },
    layout: [
      {
        $: {
          'android:defaultWidth': size.defaultWidth,
          'android:defaultHeight': size.defaultHeight,
        },
      },
    ],
  };
}

/**
 * Adds, replaces (size set) or removes (null) the panel activity in a parsed
 * quest manifest. Returns true when the manifest changed.
 */
export function applyQuestPanelActivity(
  manifest: Manifest,
  size: QuestDetailPanelOptions | null
): boolean {
  const before = JSON.stringify(manifest);
  // expo-horizon-core owns the quest <application>; never invent one.
  const application = manifest.manifest.application?.[0] as Node | undefined;
  if (!application) return false;
  const activities = ((application.activity ?? []) as Node[]).filter(
    (a) => a.$?.['android:name'] !== PANEL_ACTIVITY
  );
  if (size) activities.push(panelActivityElement(size));
  if (activities.length > 0) application.activity = activities;
  else delete application.activity;
  return JSON.stringify(manifest) !== before;
}

/** Brings app/src/quest/AndroidManifest.xml in line with `detailPanel`. */
export async function syncQuestPanelActivity(
  platformRoot: string,
  options: ResolvedQuestOptions
): Promise<void> {
  const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
  if (!fs.existsSync(questPath)) return;
  const manifest = await AndroidConfig.Manifest.readAndroidManifestAsync(questPath);
  if (!applyQuestPanelActivity(manifest, options.detailPanel)) return;
  await AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}

/**
 * Declares @expo-pico/core's panel activity in the quest flavor, sized by
 * `<layout>`, so `PicoWindows.isPanelAvailable` is true there and a detail
 * panel opens beside the main panel (Meta's multi-panel activity launch).
 *
 * A finalized mod because expo-horizon-core rewrites the quest manifest in a
 * dangerous mod.
 */
export const withQuestPanelActivity: ConfigPlugin<ResolvedQuestOptions> = (config, options) =>
  withFinalizedMod(config, [
    'android',
    async (cfg) => {
      await syncQuestPanelActivity(cfg.modRequest.platformProjectRoot, options);
      return cfg;
    },
  ]) as typeof config;
