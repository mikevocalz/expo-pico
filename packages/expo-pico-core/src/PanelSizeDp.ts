// eslint-disable-next-line @typescript-eslint/no-unused-vars -- resolves the {@linkcode} target below
import type { PicoPanelHost } from './PicoPanelHost.nitro';

/**
 * A panel's size in dp, passed to {@linkcode PicoPanelHost.openPanel}.
 * Converted to pixels at the launching window's density. Both values must
 * be positive and must differ: PICO OS 5 ignores a square override size.
 */
export interface PanelSizeDp {
  /** Width in dp. */
  widthDp: number;
  /** Height in dp. */
  heightDp: number;
}
