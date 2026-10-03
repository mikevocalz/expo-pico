import {
  resolvePicoLayoutPrimitive,
  type PicoSpatialLayoutPlacement,
  type PicoSpatialLayoutPrimitive,
  type PicoSpatialLayoutRole,
} from '@expo-pico/spatial';

/**
 * The sample's spatial workspace: one intent per surface, resolved through
 * `@expo-pico/spatial`'s layout contract.
 *
 * `resolvePicoLayoutPrimitive` names the PICO Spatial SDK 6 primitive each
 * surface should open as. Nothing on the device can open those yet
 * (`nativeLayoutBridgeBound` is false), so the immersive scene places each
 * surface as a Viro panel at the pose its primitive would take. When the
 * native bridge lands, the intents stay the same and only the presenter
 * changes.
 */

export type WorkspaceSurfaceId = 'library' | 'stage' | 'details' | 'controls';

export interface WorkspaceSurface {
  id: WorkspaceSurfaceId;
  title: string;
  role: PicoSpatialLayoutRole;
  placement: PicoSpatialLayoutPlacement;
}

export const WORKSPACE: readonly WorkspaceSurface[] = [
  { id: 'library', title: 'Library', role: 'master', placement: 'start' },
  { id: 'stage', title: 'Stage', role: 'content', placement: 'center' },
  { id: 'details', title: 'Details', role: 'inspector', placement: 'end' },
  { id: 'controls', title: 'Controls', role: 'accessory', placement: 'bottom' },
];

/** Metres, user at the floor origin looking down -Z. */
export interface SurfacePose {
  position: [number, number, number];
  /** Degrees about Y, turning the panel to face the user. */
  yaw: number;
}

// Comfort zone: 1.0-2.0 m out, centre a little under eye height, side panels
// within the 30-55 degree band so the head turns, the body does not.
const RADIUS = 1.5;
const EYE_Y = 1.35;
const SIDE_YAW = 38;

function onArc(yawDeg: number, y: number): SurfacePose {
  const r = (yawDeg * Math.PI) / 180;
  return {
    position: [Math.sin(r) * RADIUS, y, -Math.cos(r) * RADIUS],
    yaw: -yawDeg,
  };
}

const POSES: Partial<Record<PicoSpatialLayoutPrimitive, SurfacePose>> = {
  'window-container-planar': onArc(0, EYE_Y),
  'subwindow-start': onArc(-SIDE_YAW, EYE_Y),
  'subwindow-end': onArc(SIDE_YAW, EYE_Y),
  // Toolbar hangs under the main window, tilted up toward the user's gaze.
  toolbar: { position: [0, EYE_Y - 0.52, -RADIUS + 0.12], yaw: 0 },
};

export interface ResolvedSurface extends WorkspaceSurface {
  primitive: PicoSpatialLayoutPrimitive;
  pose: SurfacePose | null;
}

export function resolveWorkspace(
  surfaces: readonly WorkspaceSurface[] = WORKSPACE
): ResolvedSurface[] {
  return surfaces.map((s) => {
    const primitive = resolvePicoLayoutPrimitive(s.role, s.placement);
    return { ...s, primitive, pose: POSES[primitive] ?? null };
  });
}
