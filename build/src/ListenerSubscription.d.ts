/**
 * A listener registration, returned by
 * {@linkcode PicoPanelHost.addOnPanelOpenedListener} and
 * {@linkcode PicoPanelHost.addOnPanelClosedListener}.
 */
export interface ListenerSubscription {
    /** Stops future calls to the listener. Safe to call more than once. */
    remove: () => void;
}
//# sourceMappingURL=ListenerSubscription.d.ts.map