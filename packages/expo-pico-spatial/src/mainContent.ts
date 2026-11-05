/** A frame inside a measured host, in the host's units. */
export interface MainContentFrame {
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * The largest frame of `aspectRatio` (width / height) that fits a `width` x
 * `height` host, centred. Null while the host has no valid size yet.
 *
 * Horizon OS and PICO OS 5 let the user resize the main panel to any shape,
 * and the manifest cannot stop that: Android ignores `minAspectRatio` and
 * `maxAspectRatio` on resizeable activities. Laying the content out in this
 * frame keeps it at the launch aspect at every window size, the same way on
 * both headsets, and leaves the window bounds alone. Ported from MoyoLearn
 * (apps/mobile/src/spatial/main-content-geometry.ts).
 *
 * @throws When `aspectRatio` is not a positive finite number.
 */
export function fitMainContent(
  width: number,
  height: number,
  aspectRatio: number
): MainContentFrame | null {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error(`[@expo-pico/spatial] aspect ratio must be positive, got ${aspectRatio}.`);
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  const contentWidth = Math.min(width, height * aspectRatio);
  const contentHeight = contentWidth / aspectRatio;
  return {
    width: contentWidth,
    height: contentHeight,
    left: (width - contentWidth) / 2,
    top: (height - contentHeight) / 2,
  };
}
