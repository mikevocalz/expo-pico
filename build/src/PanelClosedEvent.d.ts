import type { PanelCloseReason } from './PanelCloseReason';
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
//# sourceMappingURL=PanelClosedEvent.d.ts.map