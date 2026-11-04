import type { ReactNode } from 'react';
import { create } from 'zustand';

import type { SpatialWindowPlacement, SpatialWindowSpec } from '@expo-pico/spatial';

/** One window the root host renders: its spec and content. */
export interface HostedSpatialWindow {
  window: SpatialWindowSpec;
  content: ReactNode;
}

interface SpatialWindowHostState {
  /** Requested windows by label, in mount order. */
  windows: Readonly<Record<string, HostedSpatialWindow>>;
  /** Adds or replaces the window with this label. */
  mount: (entry: HostedSpatialWindow) => void;
  /** Removes the window with this label; an unknown label is ignored. */
  unmount: (label: string) => void;
}

/**
 * The windows `SpatialWindowHost` renders at the main surface's origin
 * (Harlem Might ADR 0005). Surfaces add themselves with
 * `useHostedSpatialWindow` instead of rendering a window where they are
 * declared.
 */
export const useSpatialWindowHostStore = create<SpatialWindowHostState>((set) => ({
  windows: {},
  mount: (entry) =>
    set((state) => ({ windows: { ...state.windows, [entry.window.label]: entry } })),
  unmount: (label) =>
    set((state) => {
      if (!(label in state.windows)) return state;
      const rest = { ...state.windows };
      delete rest[label];
      return { windows: rest };
    }),
}));

interface StripPlacementState {
  placements: Readonly<Record<string, SpatialWindowPlacement>>;
  setPlacement: (label: string, placement: SpatialWindowPlacement) => void;
}

/**
 * Placement of windows a PICO build draws in its main window's strip
 * (`PicoMainFrame`), in the same vocabulary as Meta's
 * `useSpatialWindowState`, so a surface cannot tell the backends apart.
 */
export const useStripPlacementStore = create<StripPlacementState>((set) => ({
  placements: {},
  setPlacement: (label, placement) =>
    set((state) => ({ placements: { ...state.placements, [label]: placement } })),
}));
