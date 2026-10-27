// eslint-disable-next-line @typescript-eslint/no-unused-vars -- resolves the {@linkcode} target below
import type { PicoPanelHost } from './PicoPanelHost.nitro';

/**
 * Why a panel closed: `app` when JS called
 * {@linkcode PicoPanelHost.closePanel}, `user` for Back or the OS removing
 * the panel.
 *
 * @see {@linkcode PanelClosedEvent.reason}
 */
export type PanelCloseReason = 'app' | 'user';
