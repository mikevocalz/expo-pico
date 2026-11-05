import React from 'react';
import { SvgXml } from 'react-native-svg';

import { LUCIDE_ICONS, type LucideIconName } from '@expo-pico/core';

/**
 * A Lucide icon for the 2D surfaces, drawn from the same geometry
 * @expo-pico/core ships for the immersive scene, so both use one icon set.
 */
export function LucideGlyph({
  name,
  size = 24,
  color,
}: {
  name: LucideIconName;
  size?: number;
  color: string;
}): React.JSX.Element {
  const xml =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" ` +
    `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LUCIDE_ICONS[name]}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}
