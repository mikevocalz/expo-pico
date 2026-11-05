import { useLayoutEffect, type ReactNode } from 'react';

import type { SpatialWindowPlacement, SpatialWindowSpec } from '@expo-pico/spatial';

import { spatialWindows } from './spatialWindows';
import { useSpatialWindowHostStore } from './spatialWindowHost.store';

/**
 * Asks for `content` to show in its own window, rendered by
 * `SpatialWindowHost` (Meta) or `PicoMainFrame`'s strip (PICO). Ported from
 * Harlem Might and MoyoLearn.
 *
 * Returns the window's placement. Draw the in-window fallback whenever it is
 * not `spatial`: `pending` while the OS places it, `dropped` when it was
 * refused, `inline` where nothing asks for a window. The host never draws the
 * content inline.
 *
 * `content` renders outside the caller's tree position, so it sees only the
 * root layout's providers.
 */
export function useHostedSpatialWindow(
  window: SpatialWindowSpec | null,
  content: ReactNode
): SpatialWindowPlacement {
  const spatialAvailable = spatialWindows.useSpatialAvailable();
  const requested = window != null && spatialWindows.linked && spatialAvailable ? window : null;
  const label = requested?.label;
  const placement = spatialWindows.usePlacement(label ?? '');
  const mount = useSpatialWindowHostStore((state) => state.mount);
  const unmount = useSpatialWindowHostStore((state) => state.unmount);

  useLayoutEffect(() => {
    if (requested) mount({ window: requested, content });
  });
  useLayoutEffect(() => {
    if (label == null) return;
    return () => unmount(label);
  }, [label, unmount]);

  return requested ? placement : 'inline';
}
