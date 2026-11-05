import { type HybridObject } from 'react-native-nitro-modules';
import type { PicoPanelHost } from './PicoPanelHost.nitro';
/**
 * Extra panels for this app on PICO OS 5 and Meta Horizon OS. `new PicoWindows()` is cheap; panels come
 * from {@linkcode PicoWindows.createPanelHost}.
 *
 * Android only. On other platforms the constructor throws.
 */
export declare class PicoWindows extends HybridObject {
    constructor();
    /**
     * True when this APK declares the panel activity: a PICO build with the
     * `windows.panelActivity` plugin option left on, or a Meta Horizon OS
     * (`quest`) build with the expo-horizon-quest `detailPanel` option. When false,
     * {@linkcode PicoWindows.createPanelHost} rejects; render the content in
     * the main window instead.
     */
    readonly isPanelAvailable: boolean;
    /**
     * Resolves a {@linkcode PicoPanelHost} ready to open panels.
     *
     * @throws When {@linkcode PicoWindows.isPanelAvailable} is false.
     */
    createPanelHost(): Promise<PicoPanelHost>;
}
export * from '#nitro/PicoWindows';
//# sourceMappingURL=PicoWindows.nitro.d.ts.map