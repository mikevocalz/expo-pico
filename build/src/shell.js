"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RAIL_WINDOW_LABEL = exports.PANEL_WIDTH_RANGE_DP = exports.ATTACHED_WINDOW_GAP_DP = void 0;
exports.createSpatialShell = createSpatialShell;
exports.attachedWindowFrame = attachedWindowFrame;
exports.detailPanelCommand = detailPanelCommand;
exports.detailPanelStatusAfter = detailPanelStatusAfter;
const mainContent_1 = require("./mainContent");
/**
 * Measured on a Quest 3S, Horizon OS 207 (Harlem Might ADR 0006): a window
 * anchored `{ parent: 'left', child: 'right' }` with no offset sits flush
 * with the main window, gap -0.4dp, twice. The rail uses that anchor, and
 * PICO's in-window rail strip leaves the same gap.
 */
exports.ATTACHED_WINDOW_GAP_DP = 0;
/**
 * Meta's documented panel width range for a second activity panel
 * (panel-sizing docs, as applied in Harlem Might's spatial-panels plugin).
 */
exports.PANEL_WIDTH_RANGE_DP = { min: 384, max: 1440 };
/** The Layout SDK label of the rail window. */
exports.RAIL_WINDOW_LABEL = 'rail';
function assertPositive(name, value) {
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
function createSpatialShell(tokens) {
    for (const [name, value] of Object.entries(tokens))
        assertPositive(name, value);
    const { detailWidthDp, detailHeightDp } = tokens;
    if (detailWidthDp < exports.PANEL_WIDTH_RANGE_DP.min || detailWidthDp > exports.PANEL_WIDTH_RANGE_DP.max) {
        throw new Error(`[@expo-pico/spatial] detailWidthDp ${detailWidthDp} is outside Meta's ` +
            `${exports.PANEL_WIDTH_RANGE_DP.min}-${exports.PANEL_WIDTH_RANGE_DP.max}dp panel range.`);
    }
    if (detailWidthDp === detailHeightDp) {
        throw new Error(`[@expo-pico/spatial] detail panel is ${detailWidthDp}x${detailHeightDp}dp. PICO OS 5 ` +
            'ignores a square launch size; make width and height differ.');
    }
    const railHeightDp = (itemCount) => {
        if (!Number.isInteger(itemCount) || itemCount < 1) {
            throw new Error(`[@expo-pico/spatial] the rail needs at least one destination, got ${itemCount}.`);
        }
        return itemCount * tokens.railItemDp + 2 * tokens.railPaddingDp;
    };
    const mainContentAspectRatio = tokens.mainWidthDp / tokens.mainHeightDp;
    return {
        tokens: Object.freeze({ ...tokens }),
        railHeightDp,
        railWindow: (itemCount) => ({
            label: exports.RAIL_WINDOW_LABEL,
            windowWidth: tokens.railWidthDp,
            windowHeight: railHeightDp(itemCount),
            priority: 20,
            promotable: true,
            fallback: 'drop',
            anchor: { parent: 'left', child: 'right' },
        }),
        railStripWidthDp: tokens.railWidthDp + exports.ATTACHED_WINDOW_GAP_DP,
        detailPanelSizeDp: Object.freeze({
            widthDp: Math.round(detailWidthDp),
            heightDp: Math.round(detailHeightDp),
        }),
        mainContentAspectRatio,
        fitMainContent: (width, height) => (0, mainContent_1.fitMainContent)(width, height, mainContentAspectRatio),
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
function attachedWindowFrame(window) {
    const anchor = window.anchor;
    if (typeof anchor !== 'object' || !('parent' in anchor))
        return null;
    if (window.offset != null)
        return null;
    const horizontal = (point) => typeof point === 'string' ? point : (point.horizontal ?? null);
    if (horizontal(anchor.parent) !== 'left' || horizontal(anchor.child) !== 'right')
        return null;
    return {
        widthDp: Math.round(window.windowWidth),
        heightDp: Math.round(window.windowHeight),
        gapDp: exports.ATTACHED_WINDOW_GAP_DP,
    };
}
/**
 * What to ask of the detail panel now, or null for nothing. A selection
 * opens the panel only from `closed`, so a failed launch is not retried for
 * the same selection; clearing the selection closes an opening or open
 * panel. Pure.
 */
function detailPanelCommand(input) {
    const { selectedId, status, isAvailable } = input;
    if (selectedId != null)
        return isAvailable && status === 'closed' ? 'open' : null;
    return status === 'opening' || status === 'open' ? 'close' : null;
}
/** The status after `event`. Pure. */
function detailPanelStatusAfter(event) {
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
//# sourceMappingURL=shell.js.map