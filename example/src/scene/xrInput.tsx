import React, { useCallback, useState } from 'react';
import { ViroController, useAnySourceHover, useAnySourcePressed } from '@reactvision/react-viro';

import { isHorizonBuild } from '../platform';

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

// Viro types the payload as `any`. The renderer's ControllerStatus enum
// (VROEventDelegate.h) is numeric, Connected = 3, and crosses JNI as an int;
// the name form is accepted too in case the bridge maps it.
const CONTROLLER_CONNECTED = 3;
const CONTROLLER_GONE = new Set<unknown>([4, 5, 'DISCONNECTED', 'ERROR']);

function normalize(status: unknown): unknown {
  return typeof status === 'string' ? status.toUpperCase() : status;
}

// Shared across scenes: each scene mounts its own XrController, and a status
// event that arrived under the previous scene must not be lost on the switch.
let controllerSeenGlobal = false;

/**
 * Reticle always on. Controller models are hidden by default on Meta Horizon
 * builds, where Meta VR Glasses have no controllers, and shown once Viro
 * reports a connected controller; a disconnect or error hides them again.
 * Whether the OpenXR backend emits this status is unverified on device;
 * without it Quest users see the reticle and ray only.
 */
export function XrController(): React.JSX.Element {
  const [controllerSeen, setControllerSeen] = useState(controllerSeenGlobal);
  const onControllerStatus = useCallback((status: unknown) => {
    const s = normalize(status);
    let next: boolean;
    if (s === CONTROLLER_CONNECTED || s === 'CONNECTED') next = true;
    else if (CONTROLLER_GONE.has(s)) next = false;
    else return;
    controllerSeenGlobal = next;
    setControllerSeen(next);
  }, []);

  return (
    <ViroController
      reticleVisibility
      controllerVisibility={!isHorizonBuild || controllerSeen}
      onControllerStatus={isHorizonBuild ? onControllerStatus : undefined}
    />
  );
}
