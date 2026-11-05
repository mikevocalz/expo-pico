import { readFileSync } from 'fs';
import { join } from 'path';

import {
  isImmersiveRoute,
  mainContentFrameFor,
  useMainContentFrameStore,
} from '../mainContentFrame.store';
import { SHELL } from '../shell';

// Ported from MoyoLearn's main-content-geometry.test.ts: the main content
// keeps the launch aspect app.config.ts declares, at any panel size.

describe('main content frame', () => {
  it('uses the launch aspect app.config.ts declares for the quest and pico main panel', () => {
    const config = readFileSync(join(__dirname, '..', '..', '..', 'app.config.ts'), 'utf8');
    // Main panel sizes are written on two lines; the detail panel's is inline.
    const sizes = [...config.matchAll(/defaultWidth: '(\d+)dp',\n\s*defaultHeight: '(\d+)dp'/g)];
    expect(sizes).toHaveLength(2);
    for (const [, width, height] of sizes) {
      expect(SHELL.mainContentAspectRatio).toBe(Number(width) / Number(height));
    }
    expect(SHELL.mainContentAspectRatio).toBe(1.6);
  });

  it('frames the measured panel at 1.6 after a resize to another shape', () => {
    const store = useMainContentFrameStore.getState();
    store.setHostSize(900, 900);
    const frame = mainContentFrameFor(useMainContentFrameStore.getState());
    expect(frame).toEqual({ width: 900, height: 562.5, left: 0, top: 168.75 });
  });

  it('ignores a layout pass that did not change the size', () => {
    useMainContentFrameStore.getState().setHostSize(1280, 800);
    const before = useMainContentFrameStore.getState();
    before.setHostSize(1280, 800);
    expect(useMainContentFrameStore.getState()).toBe(before);
  });

  it('has no frame before the first layout', () => {
    expect(mainContentFrameFor({ hostWidth: 0, hostHeight: 0 })).toBeNull();
  });

  it('leaves the inline XR route unframed', () => {
    expect(isImmersiveRoute('/xr')).toBe(true);
    expect(isImmersiveRoute('/')).toBe(false);
    expect(isImmersiveRoute('/diagnostics')).toBe(false);
  });
});
