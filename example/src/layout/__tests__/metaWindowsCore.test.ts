import React from 'react';

import type { SpatialWindowSpec } from '@expo-pico/spatial';

import { createMetaWindows, type MetaLayoutModules } from '../metaWindowsCore';

const RAIL: SpatialWindowSpec = {
  label: 'rail',
  windowWidth: 96,
  windowHeight: 240,
  priority: 20,
  promotable: true,
  fallback: 'drop',
  anchor: { parent: 'left', child: 'right' },
};

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
    const el = mw.Window({ window: RAIL, children: child });
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
    expect(mw.usePlacement('rail')).toBe('inline');
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
    expect(mw.Window({ window: RAIL, children: child }).type).toBe(React.Fragment);
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

  it('passes the window spec through unchanged', () => {
    const { modules, SpatialWindow } = fakeModules();
    const mw = createMetaWindows(true, () => modules);
    const el = mw.Window({ window: RAIL, children: child });
    expect(el.type).toBe(SpatialWindow);
    expect(el.props).toMatchObject(RAIL);
    expect((el.props as { offset?: unknown }).offset).toBeUndefined();
  });

  it('reads placement and availability from the SDK hooks', () => {
    const { modules, calls } = fakeModules();
    const mw = createMetaWindows(true, () => modules);
    expect(mw.usePlacement('rail')).toBe('spatial');
    expect(calls.placement).toEqual(['rail']);
    expect(mw.useSpatialAvailable()).toBe(true);
  });
});
