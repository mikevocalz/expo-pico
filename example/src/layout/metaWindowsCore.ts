import React from 'react';

import type { MetaWindowSpec } from './workspace';

/**
 * The parts of `@metavr/layout-compat` and `@metavr/layout-window-compat`
 * this app uses, typed locally so this file never imports them. Meta's own
 * types are Flow-generated and declare `children` as Flow's `Node`.
 */
export type MetaWindowPlacement = 'inline' | 'spatial' | 'pending' | 'dropped';

export interface MetaLayoutModules {
  layout: {
    SpatialSceneProvider: React.ComponentType<{
      initializer?: unknown;
      children?: React.ReactNode;
    }>;
    useSpatialScene: () => { isSpatialAvailable: boolean };
  };
  window: {
    SpatialWindow: React.ComponentType<Record<string, unknown> & { children?: React.ReactNode }>;
    createWindowScene: (options?: { fallback?: 'inline' | 'drop' }) => unknown;
    useSpatialWindowState: (label: string) => { placement: MetaWindowPlacement };
  };
}

export interface MetaWindows {
  /** True once the SDK modules loaded; false on PICO, phone, iOS and web. */
  readonly linked: boolean;
  /** Wraps the app once. A fragment when the SDK is not linked. */
  SceneProvider: (props: { children?: React.ReactNode }) => React.ReactElement;
  /** A spatial window with inline fallback, or its children in place. */
  Window: (props: { spec: MetaWindowSpec; children?: React.ReactNode }) => React.ReactElement;
  /** Placement of one window. Always `inline` when the SDK is not linked. */
  usePlacement: (label: string) => MetaWindowPlacement;
  /** Whether this host can place spatial windows at all. */
  useSpatialAvailable: () => boolean;
}

const useInline = (): MetaWindowPlacement => 'inline';
const useUnavailable = (): boolean => false;

/**
 * Builds the app's Meta window facade.
 *
 * `enabled` is `isHorizonBuild`: Meta's components may only render in the
 * quest flavor. Elsewhere the codegen'd `SpatialWindowView` exists in C++
 * but has no view manager (expo-pico-core strips the SDK from those
 * flavors), so rendering it would fail. Disabled, `load` is never called and
 * every window renders its children where it is declared, which is the same
 * thing Meta's `fallback="inline"` does.
 *
 * Hooks are picked once, from the load result, so a component never switches
 * hook implementations between renders.
 */
export function createMetaWindows(
  enabled: boolean,
  load: () => MetaLayoutModules | null
): MetaWindows {
  let modules: MetaLayoutModules | null = null;
  if (enabled) {
    try {
      modules = load();
    } catch (e) {
      console.warn(`[metaWindows] Meta VR Layout SDK failed to load: ${String(e)}`);
      modules = null;
    }
  }

  if (!modules) {
    return {
      linked: false,
      SceneProvider: ({ children }) => React.createElement(React.Fragment, null, children),
      Window: ({ children }) => React.createElement(React.Fragment, null, children),
      usePlacement: useInline,
      useSpatialAvailable: useUnavailable,
    };
  }

  const { layout, window } = modules;
  // Meta's provider refuses configless initialization, and its initializer's
  // native type must not change while mounted, so build exactly one.
  const initializer = window.createWindowScene({ fallback: 'inline' });

  return {
    linked: true,
    SceneProvider: ({ children }) =>
      React.createElement(layout.SpatialSceneProvider, { initializer }, children),
    Window: ({ spec, children }) =>
      React.createElement(
        window.SpatialWindow,
        {
          label: spec.label,
          windowWidth: spec.width,
          windowHeight: spec.height,
          anchor: spec.anchor,
          offset: spec.zStep ? { z: spec.zStep } : undefined,
          priority: spec.priority,
          fallback: 'inline',
        },
        children
      ),
    usePlacement: (label) => window.useSpatialWindowState(label).placement,
    useSpatialAvailable: () => layout.useSpatialScene().isSpatialAvailable,
  };
}
