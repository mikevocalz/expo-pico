import type { PanelCloseReason } from './PanelCloseReason';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- resolves the {@linkcode} target below
import type { PicoPanelHost } from './PicoPanelHost.nitro';

/**
 * Sent when a panel opened with {@linkcode PicoPanelHost.openPanel} goes
 * away.
 *
 * @see {@linkcode PicoPanelHost.addOnPanelClosedListener}
 */
export interface PanelClosedEvent {
  /** The registered component name the panel rendered. */
  name: string;
  /** Why it closed. */
  reason: PanelCloseReason;
}
