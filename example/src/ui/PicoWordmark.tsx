import React from 'react';

import Wordmark from '../../assets/brand/pico-wordmark.svg';

/**
 * The PICO wordmark, white — a copy of `docs/assets/pico-wordmark-dark.svg`
 * ("dark" being the variant *for* dark backgrounds, filled #F5F6F7).
 *
 * The fill is baked in rather than driven by `currentColor` on purpose: every
 * surface in this app is near-black, and a tintable mark that silently fails to
 * receive its colour renders black-on-black and disappears. One fixed white
 * mark cannot fail that way.
 *
 * Imported as .svg through react-native-svg-transformer so it stays vector —
 * a headset panel renders at whatever scale the container dictates, and a
 * raster wordmark shows it.
 *
 * Native aspect is 1005x293; give it a height and the width follows.
 */
export function PicoWordmark({ height = 20 }: { height?: number }): React.JSX.Element {
  return <Wordmark height={height} width={height * (1005 / 293)} />;
}
