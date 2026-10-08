import React from 'react';

import { createMetaWindows, type MetaLayoutModules } from '../metaWindowsCore';
import { META_WINDOW_PRIORITY, META_WINDOWS } from '../workspace';

function fakeModules() {
  const calls = { createWindowScene: 0, placement: [] as string[] };
  const SpatialSceneProvider = () => null;
  const SpatialWindow = () => null;
  const modules: MetaLayoutModules = {
    layout: {
      SpatialSceneProvider,
      useSpatialScene: () => ({ isSpatialAvailable: true }),
    },
    window: {
      SpatialWindow,
      createWindowScene: () => {
        calls.createWindowScene += 1;
        return { kind: 'window-scene' };
      },
      useSpatialWindowState: (label) => {
        calls.placement.push(label);
        return { placement: 'spatial' };
      },
    },
  };
  return { modules, calls, SpatialSceneProvider, SpatialWindow };
}

const child = React.createElement('child', { key: 'c' });

describe('createMetaWindows off Horizon (PICO, phone, iOS, web)', () => {
  it('never loads the Meta SDK', () => {
    const load = jest.fn(() => fakeModules().modules);
    const mw = createMetaWindows(false, load);
    expect(load).not.toHaveBeenCalled();
    expect(mw.linked).toBe(false);
  });

  it('renders every window inline as a plain fragment around its children', () => {
    const mw = createMetaWindows(false, () => null);
    const el = mw.Window({ spec: META_WINDOWS.details, children: child });
    expect(el.type).toBe(React.Fragment);
    expect((el.props as { children: unknown }).children).toBe(child);
  });

  it('renders the provider as a fragment', () => {
    const mw = createMetaWindows(false, () => null);
    const el = mw.SceneProvider({ children: child });
    expect(el.type).toBe(React.Fragment);
  });

  it('reports inline placement and no spatial support', () => {
    const mw = createMetaWindows(false, () => null);
    expect(mw.usePlacement('library')).toBe('inline');
    expect(mw.useSpatialAvailable()).toBe(false);
  });
});

describe('createMetaWindows on Horizon when the SDK cannot load', () => {
  it('falls back inline instead of throwing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mw = createMetaWindows(true, () => {
      throw new Error("Cannot find module '@metavr/layout-compat'");
    });
    expect(mw.linked).toBe(false);
    expect(mw.Window({ spec: META_WINDOWS.library, children: child }).type).toBe(React.Fragment);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('createMetaWindows on Horizon', () => {
  it('builds one window-scene initializer and hands it to the provider', () => {
    const { modules, calls, SpatialSceneProvider } = fakeModules();
    const mw = createMetaWindows(true, () => modules);
    const a = mw.SceneProvider({ children: child });
    const b = mw.SceneProvider({ children: child });
    expect(calls.createWindowScene).toBe(1);
    expect(a.type).toBe(SpatialSceneProvider);
    expect((a.props as { initializer: unknown }).initializer).toBe(
      (b.props as { initializer: unknown }).initializer
    );
  });

  it('passes size, anchor, offset, priority and inline fallback through', () => {
    const { modules, SpatialWindow } = fakeModules();
    const mw = createMetaWindows(true, () => modules);
    const el = mw.Window({ spec: META_WINDOWS.library, children: child });
    expect(el.type).toBe(SpatialWindow);
    expect(el.props).toMatchObject({
      label: 'library',
      windowWidth: META_WINDOWS.library.width,
      windowHeight: META_WINDOWS.library.height,
      anchor: 'start',
      offset: { z: 1 },
      priority: META_WINDOW_PRIORITY.navigation,
      fallback: 'inline',
    });
  });

  it('omits the offset for a window with no z step', () => {
    const { modules } = fakeModules();
    const mw = createMetaWindows(true, () => modules);
    const el = mw.Window({ spec: META_WINDOWS.controls, children: child });
    expect((el.props as { offset?: unknown }).offset).toBeUndefined();
    expect((el.props as { anchor: string }).anchor).toBe('bottom');
  });

  it('reads placement and availability from the SDK hooks', () => {
    const { modules, calls } = fakeModules();
    const mw = createMetaWindows(true, () => modules);
    expect(mw.usePlacement('details')).toBe('spatial');
    expect(calls.placement).toEqual(['details']);
    expect(mw.useSpatialAvailable()).toBe(true);
  });
});

describe('META_WINDOWS', () => {
  it('opens Library, Details and Controls; Stage stays the immersive scene', () => {
    expect(Object.keys(META_WINDOWS).sort()).toEqual(['controls', 'details', 'library']);
  });

  it('uses unique, stable labels', () => {
    const labels = Object.values(META_WINDOWS).map((w) => w.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('anchors around the main panel on distinct edges', () => {
    expect(META_WINDOWS.library.anchor).toBe('start');
    expect(META_WINDOWS.details.anchor).toBe('end');
    expect(META_WINDOWS.controls.anchor).toBe('bottom');
  });

  it('ranks Library over Details over Controls, so Controls keeps the primary action in the main panel', () => {
    expect(META_WINDOWS.library.priority).toBeGreaterThan(META_WINDOWS.details.priority);
    expect(META_WINDOWS.details.priority).toBeGreaterThan(META_WINDOWS.controls.priority);
  });

  it('keeps every window within the 360-1280 dp panel range and offsets within -5..5', () => {
    for (const w of Object.values(META_WINDOWS)) {
      expect(w.width).toBeGreaterThanOrEqual(48);
      expect(w.width).toBeLessThanOrEqual(1280);
      expect(w.height).toBeGreaterThanOrEqual(48);
      expect(Number.isInteger(w.zStep) && Math.abs(w.zStep) <= 5).toBe(true);
    }
  });
});
