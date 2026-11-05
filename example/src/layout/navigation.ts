import type { SpatialWindowPlacement } from '@expo-pico/spatial';

/**
 * Where the shell's navigation goes (docs/adr/0001):
 *
 * - `rail-window`: the rail in its own window flush left of the main panel
 *   (Meta Layout SDK on Horizon OS, the main window's strip on PICO).
 * - `rail-inline`: the same rail as a column on the left inside the main
 *   panel.
 * - `bottom-tabs`: the phone tab bar.
 *
 * A headset always gets the rail on the left and never the bottom tab bar,
 * even when the rail window is pending, refused, or the build cannot open
 * one. Tablets and unfolded foldables get the rail inside the window, like
 * MoyoLearn's adaptive shell. Phones get the tab bar.
 */
export type NavigationPlacement = 'rail-window' | 'rail-inline' | 'bottom-tabs';

/** Material's medium window class starts at 600dp wide: tablets and unfolded foldables. */
export const RAIL_MIN_WIDTH_DP = 600;

export function navigationPlacement(input: {
  spatial: boolean;
  railWindow: SpatialWindowPlacement;
  widthDp: number;
}): NavigationPlacement {
  if (input.spatial) return input.railWindow === 'spatial' ? 'rail-window' : 'rail-inline';
  return input.widthDp >= RAIL_MIN_WIDTH_DP ? 'rail-inline' : 'bottom-tabs';
}

/** The `Platform.constants` fields Android reports from `android.os.Build`. */
export interface DeviceConstants {
  Manufacturer?: string;
  Brand?: string;
  Model?: string;
}

const HEADSET_MAKERS = new Set(['oculus', 'meta', 'pico', 'bytedance']);

/**
 * True on headset hardware, whatever flavor was installed: Quest 1/2/Pro
 * report Oculus, Quest 3/3S Meta (measured on a Quest 3S: Oculus / oculus /
 * "Quest 3S"), PICO 4 Ultra Pico / Pico / A9210. Same signal as react-viro's
 * `isQuest`, which MoyoLearn's shell reads for its `spatial` placement.
 */
export function isHeadsetDevice(os: string, constants: DeviceConstants | undefined): boolean {
  if (os !== 'android' || constants == null) return false;
  const maker = (constants.Manufacturer ?? '').toLowerCase();
  const brand = (constants.Brand ?? '').toLowerCase();
  if (HEADSET_MAKERS.has(maker) || HEADSET_MAKERS.has(brand)) return true;
  return /\bquest\b/i.test(constants.Model ?? '');
}
