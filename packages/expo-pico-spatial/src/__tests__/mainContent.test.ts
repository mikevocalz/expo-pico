import { fitMainContent } from '../mainContent';
import { createSpatialShell, type SpatialShellTokens } from '../shell';

// Ported from MoyoLearn apps/mobile/src/spatial/main-content-geometry.test.ts.
// Horizon OS and PICO OS 5 let the user resize the main panel freely. The
// window's own aspect cannot be locked from the manifest (Android ignores
// minAspectRatio/maxAspectRatio on resizeable activities), so the content is
// fitted at the launch aspect inside whatever window the user drags to.

const RATIO = 1280 / 800;

describe('fitMainContent', () => {
  it('keeps the ratio and stays inside the host at intermediate resize sizes', () => {
    for (const [width, height] of [
      [1280, 800],
      [500, 900],
      [1600, 640],
      [801, 599],
      [320, 280],
      [1920, 1080],
    ]) {
      const frame = fitMainContent(width, height, RATIO);
      expect(frame).not.toBeNull();
      if (!frame) continue;
      expect(Math.abs(frame.width / frame.height - RATIO)).toBeLessThan(1e-10);
      expect(frame.left).toBeGreaterThanOrEqual(0);
      expect(frame.top).toBeGreaterThanOrEqual(0);
      expect(frame.left + frame.width).toBeLessThanOrEqual(width + 1e-10);
      expect(frame.top + frame.height).toBeLessThanOrEqual(height + 1e-10);
      expect(frame.left).toBe((width - frame.width) / 2);
      expect(frame.top).toBe((height - frame.height) / 2);
      expect(frame.width === width || frame.height === height).toBe(true);
    }
  });

  it('never produces a frame from a zero or invalid measurement', () => {
    for (const [width, height] of [
      [0, 640],
      [1024, 0],
      [-1, 600],
      [NaN, 600],
      [800, Infinity],
    ]) {
      expect(fitMainContent(width, height, RATIO)).toBeNull();
    }
  });

  it('rejects a ratio that is not a positive number', () => {
    for (const ratio of [0, -1.6, NaN, Infinity]) {
      expect(() => fitMainContent(1280, 800, ratio)).toThrow(/aspect ratio/);
    }
  });
});

describe('the shell main panel', () => {
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

  it('takes its content aspect from the main panel launch size', () => {
    const shell = createSpatialShell(TOKENS);
    expect(shell.mainContentAspectRatio).toBe(1.6);
    expect(shell.fitMainContent(1000, 1000)).toEqual(fitMainContent(1000, 1000, 1.6));
  });

  it('rejects a main panel size that is not positive', () => {
    expect(() => createSpatialShell({ ...TOKENS, mainHeightDp: 0 })).toThrow(/mainHeightDp/);
  });
});
