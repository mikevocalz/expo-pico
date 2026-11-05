import { create } from 'zustand';

import type { MainContentFrame } from '@expo-pico/spatial';

import { SHELL } from './shell';

interface MainContentFrameState {
  /** The main panel's measured size in dp, 0 x 0 until its first layout. */
  hostWidth: number;
  hostHeight: number;
  /** Records a layout pass; an unchanged size is ignored. */
  setHostSize: (width: number, height: number) => void;
}

/**
 * The main panel's measured size, written by `MainContentFrame` on layout.
 * In memory only: the next process measures again.
 */
export const useMainContentFrameStore = create<MainContentFrameState>((set) => ({
  hostWidth: 0,
  hostHeight: 0,
  setHostSize: (width, height) =>
    set((state) =>
      state.hostWidth === width && state.hostHeight === height
        ? state
        : { hostWidth: width, hostHeight: height }
    ),
}));

/** The content frame for the measured main panel, or null before it is measured. */
export function mainContentFrameFor(state: {
  hostWidth: number;
  hostHeight: number;
}): MainContentFrame | null {
  return SHELL.fitMainContent(state.hostWidth, state.hostHeight);
}

/** Routes that own their full surface: the inline XR scene. */
export function isImmersiveRoute(pathname: string): boolean {
  return pathname === '/xr' || pathname.startsWith('/xr/');
}
