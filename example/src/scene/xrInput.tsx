import React from 'react';
import { ViroController, useAnySourceHover, useAnySourcePressed } from '@reactvision/react-viro';

/**
 * Input feedback that does not depend on hover.
 *
 * Meta VR Glasses take look + pinch and send no hover events, so a target that
 * only lights up on hover looks inert there. Three rules follow:
 *
 *  - Focus is hover from any source. Viro's `onHover` already fires for the
 *    eye-gaze ray (EYE_GAZE, source 12) as well as controllers and hands;
 *    `onGaze` is the gaze-only subset of the same events, so a separate gaze
 *    flag would carry nothing `onHover` does not.
 *  - Every target draws a resting outline, so it reads as interactive with no
 *    focus at all. Focus brightens that outline instead of creating it.
 *  - Pressed comes from click state alone, per source: ClickDown sets it and
 *    ClickUp clears it (Viro's `useAnySourcePressed`). Hover-exit never clears
 *    it: on a device that sends no hover it would never fire, and on a
 *    controller a ray drifting off mid-press would cancel the feedback early.
 */

/** Opacity of a target's outline at rest and when focused or pressed. */
export const OUTLINE_REST = 0.18;
export const OUTLINE_ACTIVE = 0.6;

type HoverHandler = ReturnType<typeof useAnySourceHover>[1];

export type TargetFocus = { focused: boolean; onHover: HoverHandler };

/** Focus from any hover source, the eye-gaze ray included. */
export function useTargetFocus(): TargetFocus {
  const [focused, onHover] = useAnySourceHover();
  return { focused, onHover };
}

/** Pressed while any source holds a click down. */
export const usePressState = useAnySourcePressed;

/**
 * Reticle and controller models always on. The renderer draws a controller
 * only while the runtime tracks it, so a headset with no controllers in hand
 * (Meta VR Glasses, or a Quest in hands mode) shows hands and the reticle
 * without any JS gating. Viro's onControllerStatus never fires on the OpenXR
 * backend, so gating on it hid Quest controllers entirely.
 */
export function XrController(): React.JSX.Element {
  return <ViroController reticleVisibility controllerVisibility />;
}
