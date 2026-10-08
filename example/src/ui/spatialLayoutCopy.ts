import type { MetaWindowPlacement } from '../layout/metaWindowsCore';
import { META_WINDOWS, type MetaWindowAnchor, type WorkspaceSurfaceId } from '../layout/workspace';

/**
 * Words for the launcher's "Spatial layout" card on Meta Horizon OS builds,
 * where Library, Details and Controls are Layout SDK windows. Pure, so the
 * copy for every placement state is covered by tests.
 */

type WindowId = keyof typeof META_WINDOWS;
export type MetaPlacements = Readonly<Record<WindowId, MetaWindowPlacement>>;

const WINDOW_ORDER: readonly WindowId[] = ['library', 'details', 'controls'];

const TITLES: Record<WindowId, string> = {
  library: 'Library',
  details: 'Details',
  controls: 'Controls',
};

const SIDE: Record<MetaWindowAnchor, string> = {
  start: 'Window on the left',
  end: 'Window on the right',
  bottom: 'Window below',
};

/** Row detail for one surface in the card's list. */
export function metaSurfaceDetail(
  id: WorkspaceSurfaceId,
  placement: MetaWindowPlacement | null
): string {
  if (id === 'stage') return 'Immersive scene';
  switch (placement) {
    case 'spatial':
      return SIDE[META_WINDOWS[id].anchor];
    case 'pending':
      return 'Opening as a window';
    case 'dropped':
      return 'Hidden until a window is free';
    default:
      return 'In this panel';
  }
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export interface MetaStatus {
  text: string;
  tone: 'ok' | 'warn';
}

/**
 * The status line under the list. `available` is Meta's `isSpatialAvailable`,
 * which reads false both while the scene is still starting and on Horizon OS
 * releases before v207, so the unavailable copy is true in both cases.
 */
export function metaStatus(available: boolean, placements: MetaPlacements): MetaStatus {
  const of = (p: MetaWindowPlacement) =>
    WINDOW_ORDER.filter((id) => placements[id] === p).map((id) => TITLES[id]);
  const placed = of('spatial');
  const pending = of('pending');
  const all = joinNames(WINDOW_ORDER.map((id) => TITLES[id]));
  const stage = 'Stage opens as the immersive scene.';

  if (!available && placed.length === 0 && pending.length === 0) {
    return {
      text: `${all} are in this panel. They open as separate windows on Horizon OS v207 and later. ${stage}`,
      tone: 'warn',
    };
  }
  if (placed.length === 0) {
    return { text: `Opening ${all} as windows. ${stage}`, tone: 'warn' };
  }
  if (placed.length === WINDOW_ORDER.length) {
    return { text: `${all} are open as windows around this panel. ${stage}`, tone: 'ok' };
  }
  const waiting = WINDOW_ORDER.filter((id) => placements[id] !== 'spatial').map((id) => TITLES[id]);
  const verb = waiting.length === 1 ? 'stays' : 'stay';
  return {
    text:
      `${joinNames(placed)} ${placed.length === 1 ? 'is' : 'are'} open as ` +
      `${placed.length === 1 ? 'a window' : 'windows'} around this panel. ` +
      `${joinNames(
        waiting
      )} ${verb} here, since Horizon OS gives an app two extra windows. ${stage}`,
    tone: 'ok',
  };
}
