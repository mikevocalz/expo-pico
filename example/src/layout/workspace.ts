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

/**
 * Meta Horizon OS (quest flavor): how each 2D-capable surface opens as a Meta
 * VR Layout SDK spatial window around the launcher's main panel. Stage has no
 * entry: on Meta it stays the immersive Viro scene in VRActivity.
 *
 * Anchors are the semantic edges from Meta's anchoring doc: Library on the
 * start edge, Details on the end edge, Controls under the main panel. The side
 * windows sit one semantic step (~8 dp) toward the user, as in Meta's own
 * end-anchored example.
 *
 * Priority (Meta's window-priority doc): the React Native integration reserves
 * two spatial slots, so one of the three always renders inline in the main
 * panel. Controls holds the Enter XR button, the launcher's one primary
 * action, and Meta's best practices keep the core experience in the main
 * window, so Controls takes the lowest tier and stays inline unless a slot
 * frees up. Library (navigation) outranks Details (read-only status). Tiers
 * step by 10 so a new window can slot between them.
 *
 * Sizes are dp, fixed for the session: Meta asks for stable window geometry
 * because every change crosses into the platform window manager.
 */
export type MetaWindowAnchor = 'start' | 'end' | 'bottom';

export interface MetaWindowSpec {
  /** Stable label; Meta keys placement state on it. */
  label: string;
  width: number;
  height: number;
  anchor: MetaWindowAnchor;
  /** Semantic z step toward the user, -5..5 (Meta's OffsetNear is 1). */
  zStep: number;
  priority: number;
}

export const META_WINDOW_PRIORITY = {
  navigation: 20,
  status: 10,
  actions: 0,
} as const;

export const META_WINDOWS: Readonly<Record<Exclude<WorkspaceSurfaceId, 'stage'>, MetaWindowSpec>> =
  {
    library: {
      label: 'library',
      width: 360,
      height: 320,
      anchor: 'start',
      zStep: 1,
      priority: META_WINDOW_PRIORITY.navigation,
    },
    details: {
      label: 'details',
      width: 440,
      height: 600,
      anchor: 'end',
      zStep: 1,
      priority: META_WINDOW_PRIORITY.status,
    },
    controls: {
      label: 'controls',
      width: 560,
      height: 168,
      anchor: 'bottom',
      zStep: 0,
      priority: META_WINDOW_PRIORITY.actions,
    },
  };

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
