import type { SpatialWindowPlacement } from '@expo-pico/spatial';

import { isPicoHeadsetBuild } from '../platform';
import { metaWindows } from './metaWindows';
import { useStripPlacementStore } from './spatialWindowHost.store';

export interface SpatialWindowBackend {
  /** Which backend places hosted windows on this build. */
  readonly kind: 'meta' | 'pico-strip' | 'none';
  readonly linked: boolean;
  usePlacement: (label: string) => SpatialWindowPlacement;
  useSpatialAvailable: () => boolean;
}

const usePendingStripPlacement = (label: string): SpatialWindowPlacement =>
  useStripPlacementStore((state) => state.placements[label] ?? 'pending');

/**
 * The build's window backend, chosen once at module load so no component
 * switches hook implementations between renders:
 *
 * - `meta` (quest flavor): Meta's Layout SDK opens the rail as its own window.
 * - `pico-strip` (pico flavor): PICO OS 5 cannot attach one window to another
 *   (activity windows have no parent), so the rail draws in a transparent
 *   strip of the main window, beside the main panel, at the Quest window's
 *   size. Ported from MoyoLearn's `panelWindows.tsx`.
 * - `none` (phones): every window stays inline.
 */
export const spatialWindows: SpatialWindowBackend = metaWindows.linked
  ? {
      kind: 'meta',
      linked: true,
      usePlacement: metaWindows.usePlacement,
      useSpatialAvailable: metaWindows.useSpatialAvailable,
    }
  : isPicoHeadsetBuild
    ? {
        kind: 'pico-strip',
        linked: true,
        usePlacement: usePendingStripPlacement,
        useSpatialAvailable: () => true,
      }
    : {
        kind: 'none',
        linked: false,
        usePlacement: metaWindows.usePlacement,
        useSpatialAvailable: metaWindows.useSpatialAvailable,
      };
