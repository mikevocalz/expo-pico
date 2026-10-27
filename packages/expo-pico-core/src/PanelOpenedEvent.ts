// eslint-disable-next-line @typescript-eslint/no-unused-vars -- resolves the {@linkcode} target below
import type { PicoPanelHost } from './PicoPanelHost.nitro';

/**
 * Sent when a panel opened with {@linkcode PicoPanelHost.openPanel} is on
 * screen.
 *
 * @see {@linkcode PicoPanelHost.addOnPanelOpenedListener}
 */
export interface PanelOpenedEvent {
  /** The registered component name the panel renders. */
  name: string;
}
