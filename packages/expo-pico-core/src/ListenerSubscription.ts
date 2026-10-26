// eslint-disable-next-line @typescript-eslint/no-unused-vars -- resolves the {@linkcode} target below
import type { PicoPanelHost } from './PicoPanelHost.nitro';

/**
 * A listener registration, returned by
 * {@linkcode PicoPanelHost.addOnPanelOpenedListener} and
 * {@linkcode PicoPanelHost.addOnPanelClosedListener}.
 */
export interface ListenerSubscription {
  /** Stops future calls to the listener. Safe to call more than once. */
  remove: () => void;
}
