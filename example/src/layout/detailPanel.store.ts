import { create } from 'zustand';

import type { DetailPanelStatus, SpatialWindowPlacement } from '@expo-pico/spatial';
import type { PicoPanelHost } from '@expo-pico/core';

import type { DetailId } from './shell';

interface ShellState {
  /** Detail content the user opened, or null. Shared with the panel's surface. */
  selectedId: DetailId | null;
  /** Where the detail panel is. Stays `closed` on builds without panels. */
  status: DetailPanelStatus;
  /** The panel host once `DetailPanelHost` has one; null on phones and while it resolves. */
  panelHost: PicoPanelHost | null;
  /** The rail window's placement, mirrored for the layout detail. */
  railPlacement: SpatialWindowPlacement;
  select: (id: DetailId) => void;
  clear: () => void;
  /**
   * The pushed detail screen for `id` went away (Close, hardware BACK, a
   * gesture). Clears the selection if it is still `id`, and turns a `failed`
   * status back to `closed` so the next detail tries the panel again.
   */
  leaveDetailScreen: (id: DetailId) => void;
  setStatus: (status: DetailPanelStatus) => void;
  setPanelHost: (host: PicoPanelHost) => void;
  setRailPlacement: (placement: SpatialWindowPlacement) => void;
}

/**
 * The shell's state: the open detail and the panel that shows it. In memory
 * only: a panel never outlives the process that opened it. The detail panel
 * is a second surface on the same JS runtime, so it reads this store too.
 */
export const useShellStore = create<ShellState>((set) => ({
  selectedId: null,
  status: 'closed',
  panelHost: null,
  railPlacement: 'inline',
  select: (id) => set({ selectedId: id }),
  clear: () => set({ selectedId: null }),
  leaveDetailScreen: (id) =>
    set((state) =>
      state.selectedId === id
        ? { selectedId: null, status: state.status === 'failed' ? 'closed' : state.status }
        : {}
    ),
  setStatus: (status) => set({ status }),
  setPanelHost: (panelHost) => set({ panelHost }),
  setRailPlacement: (railPlacement) => set({ railPlacement }),
}));
