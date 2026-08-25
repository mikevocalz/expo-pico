import React from 'react';

import Wordmark from '../../assets/brand/pico-wordmark.svg';
import { palette } from './theme';

/**
 * The PICO wordmark.
 *
 * Imported as an .svg through react-native-svg-transformer so it stays vector
 * — a headset panel renders at whatever scale the container dictates and a
 * raster wordmark shows it.
 *
 * The asset is a `currentColor` variant of `docs/assets/pico-wordmark-*.svg`.
 * The shipped files hardcode #0B0B0C and #F5F6F7, which react-native-svg
 * cannot override, so a header could not tint the mark to its own surface.
 *
 * Native aspect is 1005x293; give it a height and the width follows.
 */
export function PicoWordmark({
  height = 20,
  color = palette.text,
}: {
  height?: number;
  color?: string;
}): React.JSX.Element {
  return <Wordmark height={height} width={height * (1005 / 293)} color={color} />;
}
