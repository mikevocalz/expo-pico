import { attachedWindowFrame } from '@expo-pico/spatial';

import appConfig from '../../../app.config';
import { DESTINATIONS, destinationForPath, isDetailId, SHELL } from '../shell';

// The layout spec (docs/adr/0001): a rail of the tab bar's destinations,
// flush left of the main panel and shorter than it; detail beside main.
const MAIN_PANEL_DP = { width: 1280, height: 800 }; // app.config.ts defaultWidth/defaultHeight

describe('SHELL geometry', () => {
  const rail = SHELL.railWindow(DESTINATIONS.length);

  it('makes the rail a narrow window shorter than the main panel', () => {
    expect(rail.windowWidth).toBeLessThan(MAIN_PANEL_DP.width / 4);
    expect(rail.windowHeight).toBeLessThan(MAIN_PANEL_DP.height);
  });

  it('attaches the rail flush to the main panel left edge, no offset, never inline', () => {
    expect(rail.anchor).toEqual({ parent: 'left', child: 'right' });
    expect(rail.offset).toBeUndefined();
    expect(rail.fallback).toBe('drop');
    expect(attachedWindowFrame(rail)).toEqual({
      widthDp: rail.windowWidth,
      heightDp: rail.windowHeight,
      gapDp: 0,
    });
  });

  it('gives every rail destination at least a 48dp target', () => {
    expect(SHELL.tokens.railItemDp).toBeGreaterThanOrEqual(48);
    expect(SHELL.tokens.railWidthDp).toBeGreaterThanOrEqual(48);
  });

  it('sizes the detail panel within Meta range and not square for PICO', () => {
    const { widthDp, heightDp } = SHELL.detailPanelSizeDp;
    expect(widthDp).toBeGreaterThanOrEqual(384);
    expect(widthDp).not.toBe(heightDp);
  });
});

describe('destinations', () => {
  it('maps routes to the rail destination that owns them', () => {
    expect(destinationForPath('/')).toBe('home');
    expect(destinationForPath('/diagnostics')).toBe('diagnostics');
    expect(destinationForPath('/harness')).toBe('harness');
    expect(destinationForPath('/xr')).toBe('home');
  });

  it('keeps detail ids closed over the known content', () => {
    expect(isDetailId('headset')).toBe(true);
    expect(isDetailId('layout')).toBe(true);
    expect(isDetailId('library')).toBe(false);
  });
});

describe('app.config', () => {
  // The quest manifest's <layout> and the PICO launch size must be one size.
  it('declares the quest detail panel at the shell detail size', () => {
    const plugins = appConfig({ config: {} } as Parameters<typeof appConfig>[0]).plugins ?? [];
    const quest = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-horizon-quest') as [
      string,
      { detailPanel: { defaultWidth: string; defaultHeight: string } },
    ];
    expect(quest[1].detailPanel).toEqual({
      defaultWidth: `${SHELL.detailPanelSizeDp.widthDp}dp`,
      defaultHeight: `${SHELL.detailPanelSizeDp.heightDp}dp`,
    });
  });
});
