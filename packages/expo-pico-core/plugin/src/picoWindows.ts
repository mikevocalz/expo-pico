import { AndroidConfig } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import { MANIFEST_META } from './constants';
import type { ResolvedPicoOptions } from './types';

/**
 * PICO OS 5 window rules, as read from framework.jar and services.jar on a
 * PICO 4 Ultra (OS 5.15.7):
 *
 * - Activities of one package share a 2D window when their
 *   `pico.vr.position` meta-data match. An activity without the key counts
 *   as "far". A second activity with the main window's value replaces the
 *   main window instead of opening beside it.
 * - "near" maps to window type 2002, a popup PICO hides on any click
 *   outside it.
 * - A third-party window takes its size only from the launch's
 *   ActivityOptions, never from `<layout>`.
 */

export const VR_POSITION_META = 'pico.vr.position';
export const IMPLICIT_POSITION = 'far';
export const POPUP_POSITION = 'near';

/**
 * The panel activity's position. Any value PICO OS 5 does not map to a
 * window type gives the activity a window of its own with the main window's
 * type; "rail" is the value checked on a PICO 4 Ultra.
 */
export const PANEL_POSITION = 'rail';

export const PANEL_ACTIVITY = 'expo.modules.pico.PicoPanelActivity';

/**
 * Application meta-data the main-window listener reads. Written to the PICO
 * flavor manifest only, so it is absent from every other build.
 */
export const TRANSLUCENT_MAIN_WINDOW_META = 'expo.modules.pico.TRANSLUCENT_MAIN_WINDOW';

type Node = { $?: Record<string, string | undefined>; [key: string]: any };
type Manifest = AndroidConfig.Manifest.AndroidManifest;

const nameOf = (node: Node | undefined) => node?.$?.['android:name'];

function applicationOf(manifest: Manifest): Node {
  manifest.manifest.application = manifest.manifest.application ?? [];
  if (manifest.manifest.application.length === 0) {
    manifest.manifest.application.push({ $: {} } as never);
  }
  return manifest.manifest.application[0] as Node;
}

function panelActivityElement(): Node {
  return {
    $: {
      'android:name': PANEL_ACTIVITY,
      'android:exported': 'false',
      'android:theme': '@style/AppTheme',
      'android:configChanges':
        'keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode|smallestScreenSize|density',
      'android:resizeableActivity': 'true',
      'android:excludeFromRecents': 'true',
      // A task of its own, so PICO gives the panel a window container of
      // its own instead of stacking it on the main window's task.
      'android:taskAffinity': '${applicationId}.picopanel',
    },
    'meta-data': [{ $: { 'android:name': VR_POSITION_META, 'android:value': PANEL_POSITION } }],
  };
}

/**
 * Writes the window defaults into the PICO flavor manifest: the
 * translucent-main-window flag and the panel activity, each removed again
 * when its option is off. Idempotent.
 */
export function applyWindowContract(manifest: Manifest, options: ResolvedPicoOptions): void {
  const application = applicationOf(manifest);

  const meta = ((application['meta-data'] ?? []) as Node[]).filter(
    (m) => nameOf(m) !== TRANSLUCENT_MAIN_WINDOW_META
  );
  if (options.windows.translucentMainWindow) {
    meta.push({ $: { 'android:name': TRANSLUCENT_MAIN_WINDOW_META, 'android:value': 'true' } });
  }
  application['meta-data'] = meta;

  const activities = ((application.activity ?? []) as Node[]).filter(
    (a) => nameOf(a) !== PANEL_ACTIVITY
  );
  if (options.windows.panelActivity) activities.push(panelActivityElement());
  application.activity = activities;
}

interface ActivityWindow {
  name: string;
  /** Undefined when the activity leaves `pico.vr.position` unset. */
  explicitPosition: string | undefined;
  immersive: boolean;
}

function metaValue(activity: Node, key: string): string | undefined {
  const entry = ((activity['meta-data'] ?? []) as Node[]).find((m) => nameOf(m) === key);
  return entry?.$?.['android:value'];
}

/**
 * Each activity's window facts for the main manifest merged with one flavor
 * manifest. A flavor entry for the same activity overrides main's meta-data
 * values; `tools:node="remove"` drops the activity.
 */
export function activityWindows(main: Manifest, flavor?: Manifest): ActivityWindow[] {
  const byName = new Map<string, Node[]>();
  for (const source of flavor ? [main, flavor] : [main]) {
    const app = (source.manifest.application?.[0] ?? {}) as Node;
    for (const activity of (app.activity ?? []) as Node[]) {
      const name = nameOf(activity);
      if (!name) continue;
      const node = activity.$?.['tools:node'];
      if (node === 'remove' || node === 'removeAll') {
        byName.delete(name);
        continue;
      }
      byName.set(name, node === 'replace' ? [activity] : [...(byName.get(name) ?? []), activity]);
    }
  }
  return [...byName.entries()].map(([name, layers]) => {
    const read = (key: string) =>
      layers.reduce<string | undefined>(
        (value, layer) => metaValue(layer, key) ?? value,
        undefined
      );
    return {
      name,
      explicitPosition: read(VR_POSITION_META),
      immersive: read(MANIFEST_META.PVR_APP_TYPE) === 'vr',
    };
  });
}

/**
 * Problems with the activities' `pico.vr.position` values. The Gradle check
 * in android/pico-window-positions.gradle applies the same rules to each
 * variant's merged manifest.
 *
 * - An activity that sets "near" gets a popup window.
 * - An activity that sets a position shares the window of every other
 *   activity with the same position, the implicit "far" included.
 *
 * Activities that leave the key unset all share "far" and are not reported
 * against each other: that is how an ordinary Android app replaces its one
 * window. Immersive activities (`pvr.app.type=vr`) are skipped, because
 * PICO gives them the whole display, not a 2D window.
 */
export function windowPositionProblems(windows: ActivityWindow[]): string[] {
  const flat = windows.filter((w) => !w.immersive);
  const problems: string[] = [];
  for (const w of flat) {
    if (w.explicitPosition === undefined) continue;
    if (w.explicitPosition === POPUP_POSITION) {
      problems.push(
        `${w.name} sets ${VR_POSITION_META}="${POPUP_POSITION}", which PICO OS shows as a popup ` +
          `that hides on any click outside it. Use a value of its own, such as "${PANEL_POSITION}".`
      );
      continue;
    }
    const sharing = flat
      .filter((other) => other !== w)
      .filter((other) => (other.explicitPosition ?? IMPLICIT_POSITION) === w.explicitPosition)
      .map((other) => other.name);
    if (sharing.length > 0) {
      problems.push(
        `${w.name} sets ${VR_POSITION_META}="${w.explicitPosition}", the same window as ` +
          `${sharing.join(', ')}` +
          (w.explicitPosition === IMPLICIT_POSITION
            ? ` (an activity without the key counts as "${IMPLICIT_POSITION}")`
            : '') +
          `. PICO OS opens it in that window instead of a new one. Give each panel activity a ` +
          `distinct value.`
      );
    }
  }
  return problems;
}

export function windowPositionError(where: string, problems: string[]): Error {
  return new Error(`[pico-window-positions] ${where}:\n- ${problems.join('\n- ')}`);
}

/** Throws when main (optionally merged with flavor) breaks a position rule. */
export function assertWindowPositions(where: string, main: Manifest, flavor?: Manifest): void {
  const problems = windowPositionProblems(activityWindows(main, flavor));
  if (problems.length > 0) throw windowPositionError(where, problems);
}

/**
 * Checks app/src/main alone and with each app/src/<flavor> manifest on
 * disk. Library manifests are checked by the Gradle task, which reads the
 * merged result.
 */
export async function assertWindowPositionsOnDisk(platformProjectRoot: string): Promise<void> {
  const srcDir = path.join(platformProjectRoot, 'app', 'src');
  const mainPath = path.join(srcDir, 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(mainPath)) return;
  const main = await AndroidConfig.Manifest.readAndroidManifestAsync(mainPath);
  assertWindowPositions('app/src/main/AndroidManifest.xml', main);
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'main') continue;
    const flavorPath = path.join(srcDir, entry.name, 'AndroidManifest.xml');
    if (!fs.existsSync(flavorPath)) continue;
    const flavor = await AndroidConfig.Manifest.readAndroidManifestAsync(flavorPath);
    assertWindowPositions(`app/src/main + app/src/${entry.name} AndroidManifest.xml`, main, flavor);
  }
}
