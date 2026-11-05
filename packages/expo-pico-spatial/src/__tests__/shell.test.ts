import {
  ATTACHED_WINDOW_GAP_DP,
  attachedWindowFrame,
  createSpatialShell,
  detailPanelCommand,
  detailPanelStatusAfter,
  RAIL_WINDOW_LABEL,
  type SpatialShellTokens,
} from '../shell';

const TOKENS: SpatialShellTokens = {
  railWidthDp: 96,
  railItemDp: 72,
  railPaddingDp: 12,
  cornerRadiusDp: 24,
  detailWidthDp: 420,
  detailHeightDp: 600,
  mainWidthDp: 1280,
  mainHeightDp: 800,
};

describe('createSpatialShell', () => {
  const shell = createSpatialShell(TOKENS);

  it('sizes the rail from its destinations: slots plus top and bottom padding', () => {
    expect(shell.railHeightDp(3)).toBe(3 * 72 + 2 * 12);
    expect(shell.railHeightDp(1)).toBe(96);
  });

  it('keeps the rail shorter than the 800dp main panel for a tab bar of five', () => {
    expect(shell.railHeightDp(5)).toBeLessThan(800);
  });

  it('anchors the rail flush outside the main window physical left edge', () => {
    const rail = shell.railWindow(3);
    expect(rail).toEqual({
      label: RAIL_WINDOW_LABEL,
      windowWidth: 96,
      windowHeight: 240,
      priority: 20,
      promotable: true,
      fallback: 'drop',
      anchor: { parent: 'left', child: 'right' },
    });
    expect(rail.offset).toBeUndefined();
  });

  it('reserves a PICO strip exactly as wide as the rail plus the measured gap', () => {
    expect(ATTACHED_WINDOW_GAP_DP).toBe(0);
    expect(shell.railStripWidthDp).toBe(96);
  });

  it('gives the detail panel its launch size', () => {
    expect(shell.detailPanelSizeDp).toEqual({ widthDp: 420, heightDp: 600 });
  });

  it('rejects a rail with no destinations', () => {
    expect(() => shell.railWindow(0)).toThrow(/at least one destination/);
  });

  it.each([
    [{ detailWidthDp: 300 }, /outside Meta's 384-1440dp/],
    [{ detailWidthDp: 1600 }, /outside Meta's 384-1440dp/],
    [{ detailWidthDp: 600, detailHeightDp: 600 }, /square/],
    [{ railWidthDp: 0 }, /railWidthDp must be a positive/],
  ])('rejects tokens %p', (override, message) => {
    expect(() => createSpatialShell({ ...TOKENS, ...override })).toThrow(message);
  });
});

describe('attachedWindowFrame', () => {
  const rail = createSpatialShell(TOKENS).railWindow(3);

  it('draws the rail in the PICO main window at its Quest size', () => {
    expect(attachedWindowFrame(rail)).toEqual({ widthDp: 96, heightDp: 240, gapDp: 0 });
  });

  it('leaves floating and offset windows as their own panels', () => {
    expect(attachedWindowFrame({ ...rail, anchor: 'end' })).toBeNull();
    expect(attachedWindowFrame({ ...rail, offset: { z: 1 } })).toBeNull();
    expect(attachedWindowFrame({ ...rail, anchor: { parent: 'end', child: 'start' } })).toBeNull();
  });
});

describe('detail panel state', () => {
  it('opens only from closed, and only where panels exist', () => {
    expect(detailPanelCommand({ selectedId: 'a', status: 'closed', isAvailable: true })).toBe(
      'open'
    );
    expect(detailPanelCommand({ selectedId: 'a', status: 'closed', isAvailable: false })).toBe(
      null
    );
    expect(detailPanelCommand({ selectedId: 'a', status: 'open', isAvailable: true })).toBe(null);
    expect(detailPanelCommand({ selectedId: 'a', status: 'failed', isAvailable: true })).toBe(null);
  });

  it('closes an opening or open panel when the selection clears', () => {
    for (const status of ['opening', 'open'] as const) {
      expect(detailPanelCommand({ selectedId: null, status, isAvailable: true })).toBe('close');
    }
    expect(detailPanelCommand({ selectedId: null, status: 'closed', isAvailable: true })).toBe(
      null
    );
  });

  it('maps host events to statuses', () => {
    expect(detailPanelStatusAfter({ type: 'requested' })).toBe('opening');
    expect(detailPanelStatusAfter({ type: 'opened' })).toBe('open');
    expect(detailPanelStatusAfter({ type: 'failed' })).toBe('failed');
    expect(detailPanelStatusAfter({ type: 'closed' })).toBe('closed');
  });
});
