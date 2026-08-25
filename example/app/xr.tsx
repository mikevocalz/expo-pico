import React from 'react';
import { useRouter } from 'expo-router';

import { XrScreen } from '../src/scene/XrScreen';

/**
 * Inline XR fallback.
 *
 * Only reached when `enterImmersiveScene()` finds no VR-category activity — on
 * a headset the immersive activity takes the display instead, so the 2D panel
 * is never part of the spatial scene.
 */
export default function Xr(): React.JSX.Element {
  const router = useRouter();
  return <XrScreen onBack={() => router.back()} />;
}
