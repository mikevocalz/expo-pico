/**
 * The spatial shell: one layout for every headset this library targets.
 *
 * - A navigation rail (the phone's tab bar) in its own narrow panel, flush
 *   against the main panel's left edge, shorter than it, never closed or moved.
 * - The main panel with the app's primary content.
 * - A detail panel, opened only for special content, beside the main panel,
 *   with a title and a Close button. Closing it leaves rail and main.
 *
 * Geometry comes from {@linkcode createSpatialShell}, which both platforms
 * read: Meta Horizon OS opens the rail as a Layout SDK window and the detail
 * panel as a second activity; PICO OS 5 draws the rail in the main window's
 * left strip and opens the detail panel as a second activity. Ported from
 * Harlem Might (docs/spatial-layout/adr/0005, 0006) and MoyoLearn
 * (apps/mobile/src/spatial/railWindow.ts, panelWindowsCore.ts); see
 * docs/adr/0001-spatial-shell-rail-main-detail.md.
 */

import { fitMainContent, type MainContentFrame } from './mainContent';

/** Horizontal anchor names from Meta's `SpatialAnchor`. `left`/`right` never mirror in RTL. */
export type SpatialAnchorHorizontal = 'start' | 'end' | 'left' | 'right';

/** A point on a window's edge, as Meta's `AnchorPoint`. */
export type SpatialAnchorPoint =
  | SpatialAnchorHorizontal
  | 'top'
  | 'bottom'
  | 'center'
  | Readonly<{ horizontal?: SpatialAnchorHorizontal; vertical?: 'top' | 'bottom' }>;

/** Offset steps Meta's Layout SDK accepts: -5 to 5, about 2dp horizontally each. */
export type SpatialOffsetStep = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Props for one Layout SDK `<SpatialWindow>`, mirrored from
 * `@metavr/layout-window-compat` so this package never imports it. Sizes are dp.
 */
export type SpatialWindowSpec = Readonly<{
  label: string;
  windowWidth: number;
  windowHeight: number;
  priority: number;
  promotable: boolean;
  fallback: 'inline' | 'drop';
  anchor: SpatialAnchorPoint | Readonly<{ parent: SpatialAnchorPoint; child: SpatialAnchorPoint }>;
  /** Absent when the window sits flush with the main window. */
  offset?: Readonly<{ x?: SpatialOffsetStep; y?: SpatialOffsetStep; z?: SpatialOffsetStep }>;
  /**
   * Opaque color Meta paints behind the window's content. Without it the
   * window shows the app theme's `android:windowBackground` (Expo's splash,
   * white), which shows through as a light edge around content with rounded
   * corners. Set it to the content's own background.
   */
  windowBackgroundColor?: string;
}>;

/** Where a hosted window is, in the vocabulary of Meta's `useSpatialWindowState`. */
export type SpatialWindowPlacement = 'inline' | 'spatial' | 'pending' | 'dropped';

/**
 * Measured on a Quest 3S, Horizon OS 207 (Harlem Might ADR 0006): a window
 * anchored `{ parent: 'left', child: 'right' }` with no offset sits flush
 * with the main window, gap -0.4dp, twice. The rail uses that anchor, and
 * PICO's in-window rail strip leaves the same gap.
 */
export const ATTACHED_WINDOW_GAP_DP = 0;

/**
 * Meta's documented panel width range for a second activity panel
 * (panel-sizing docs, as applied in Harlem Might's spatial-panels plugin).
 */
export const PANEL_WIDTH_RANGE_DP = { min: 384, max: 1440 } as const;

/** The Layout SDK label of the rail window. */
export const RAIL_WINDOW_LABEL = 'rail';

/** Design tokens the shell is built from, in dp. */
export interface SpatialShellTokens {
  /** The rail's width. */
  railWidthDp: number;
  /** One rail destination's slot height, at least a 48dp target. */
  railItemDp: number;
  /** Space above the first and below the last destination. */
  railPaddingDp: number;
  /** Corner radius the rail and detail surfaces draw on their own content. */
  cornerRadiusDp: number;
  /** The detail panel's size. Width and height must differ (PICO OS 5 ignores a square size). */
  detailWidthDp: number;
  detailHeightDp: number;
  /**
   * The main panel's launch size, the `<layout>` default the manifest
   * declares. Its aspect is the one the main content keeps when the user
   * resizes the panel.
   */
  mainWidthDp: number;
  mainHeightDp: number;
}

/** Geometry every platform reads. Built by {@linkcode createSpatialShell}. */
export interface SpatialShell {
  readonly tokens: Readonly<SpatialShellTokens>;
  /** The rail's height for `itemCount` destinations: the slots plus top and bottom padding. */
  railHeightDp(itemCount: number): number;
  /**
   * The rail as a Layout SDK window: outside the main window's physical left
   * edge, flush, vertically centred, same depth. Priority 20 so navigation
   * wins a slot; `fallback: 'drop'` so it never draws inline at the host's
   * origin, and the caller draws its in-window rail instead.
   */
  railWindow(itemCount: number): SpatialWindowSpec;
  /** Width of the strip a PICO main window reserves for the rail: rail plus gap. */
  readonly railStripWidthDp: number;
  /** The detail panel's launch size. */
  readonly detailPanelSizeDp: Readonly<{ widthDp: number; heightDp: number }>;
  /** Width over height of the main panel's launch size. */
  readonly mainContentAspectRatio: number;
  /** {@linkcode fitMainContent} at {@linkcode mainContentAspectRatio}. */
  fitMainContent(width: number, height: number): MainContentFrame | null;
}

function assertPositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`[@expo-pico/spatial] ${name} must be a positive number of dp, got ${value}.`);
  }
}

/**
 * Builds the shell's geometry from `tokens`.
 *
 * @throws When a token is not positive, the detail width is outside
 *   {@linkcode PANEL_WIDTH_RANGE_DP}, or the detail size is square.
 */
export function createSpatialShell(tokens: SpatialShellTokens): SpatialShell {
  for (const [name, value] of Object.entries(tokens)) assertPositive(name, value);
  const { detailWidthDp, detailHeightDp } = tokens;
  if (detailWidthDp < PANEL_WIDTH_RANGE_DP.min || detailWidthDp > PANEL_WIDTH_RANGE_DP.max) {
    throw new Error(
      `[@expo-pico/spatial] detailWidthDp ${detailWidthDp} is outside Meta's ` +
        `${PANEL_WIDTH_RANGE_DP.min}-${PANEL_WIDTH_RANGE_DP.max}dp panel range.`
    );
  }
  if (detailWidthDp === detailHeightDp) {
    throw new Error(
      `[@expo-pico/spatial] detail panel is ${detailWidthDp}x${detailHeightDp}dp. PICO OS 5 ` +
        'ignores a square launch size; make width and height differ.'
    );
  }

  const railHeightDp = (itemCount: number): number => {
    if (!Number.isInteger(itemCount) || itemCount < 1) {
      throw new Error(
        `[@expo-pico/spatial] the rail needs at least one destination, got ${itemCount}.`
      );
    }
    return itemCount * tokens.railItemDp + 2 * tokens.railPaddingDp;
  };

  const mainContentAspectRatio = tokens.mainWidthDp / tokens.mainHeightDp;

  return {
    tokens: Object.freeze({ ...tokens }),
    railHeightDp,
    railWindow: (itemCount) => ({
      label: RAIL_WINDOW_LABEL,
      windowWidth: tokens.railWidthDp,
      windowHeight: railHeightDp(itemCount),
      priority: 20,
      promotable: true,
      fallback: 'drop',
      anchor: { parent: 'left', child: 'right' },
    }),
    railStripWidthDp: tokens.railWidthDp + ATTACHED_WINDOW_GAP_DP,
    detailPanelSizeDp: Object.freeze({
      widthDp: Math.round(detailWidthDp),
      heightDp: Math.round(detailHeightDp),
    }),
    mainContentAspectRatio,
    fitMainContent: (width, height) => fitMainContent(width, height, mainContentAspectRatio),
  };
}

/**
 * The in-window frame for a window Meta attaches flush outside the main
 * window's left edge, or null for any other window.
 *
 * PICO OS 5 cannot attach one activity window to another, so an attached
 * window opened as its own panel would float wherever the user looks. Drawn
 * in a strip of the main window instead, it moves with the main panel.
 */
export function attachedWindowFrame(
  window: SpatialWindowSpec
): { widthDp: number; heightDp: number; gapDp: number } | null {
  const anchor = window.anchor;
  if (typeof anchor !== 'object' || !('parent' in anchor)) return null;
  if (window.offset != null) return null;
  const horizontal = (point: SpatialAnchorPoint) =>
    typeof point === 'string' ? point : (point.horizontal ?? null);
  if (horizontal(anchor.parent) !== 'left' || horizontal(anchor.child) !== 'right') return null;
  return {
    widthDp: Math.round(window.windowWidth),
    heightDp: Math.round(window.windowHeight),
    gapDp: ATTACHED_WINDOW_GAP_DP,
  };
}

/**
 * Where the detail panel is.
 *
 * - `closed`: no panel.
 * - `opening`: the launch went to the OS; the panel has not reported in.
 * - `open`: the panel is on screen.
 * - `failed`: the launch threw; the app shows the detail in place (a pushed
 *   screen) until the selection clears.
 */
export type DetailPanelStatus = 'closed' | 'opening' | 'open' | 'failed';

/**
 * What to ask of the detail panel now, or null for nothing. A selection
 * opens the panel only from `closed`, so a failed launch is not retried for
 * the same selection; clearing the selection closes an opening or open
 * panel. Pure.
 */
export function detailPanelCommand(input: {
  selectedId: string | null;
  status: DetailPanelStatus;
  isAvailable: boolean;
}): 'open' | 'close' | null {
  const { selectedId, status, isAvailable } = input;
  if (selectedId != null) return isAvailable && status === 'closed' ? 'open' : null;
  return status === 'opening' || status === 'open' ? 'close' : null;
}

/** The detail panel's lifecycle events, as a panel host reports them. */
export type DetailPanelEvent =
  | { type: 'requested' }
  | { type: 'opened' }
  | { type: 'failed' }
  | { type: 'closed' };

/** The status after `event`. Pure. */
export function detailPanelStatusAfter(event: DetailPanelEvent): DetailPanelStatus {
  switch (event.type) {
    case 'requested':
      return 'opening';
    case 'opened':
      return 'open';
    case 'failed':
      return 'failed';
    case 'closed':
      return 'closed';
  }
}
