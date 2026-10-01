import React from 'react';
import { useRouter } from 'expo-router';

import { getPicoRuntimeInfo } from '@expo-pico/core';

import { XrLauncher } from '../src/scene/XrLauncher';
import { XrScreen } from '../src/scene/XrScreen';

/**
 * XR route.
 *
 * On a headset this mounts `ViroXRSceneNavigator` through `XrLauncher`, which
 * sets the scene intent and starts VRActivity. The navigator renders nothing
 * here — the immersive activity takes the display — so the 2D panel never ends
 * up inside the spatial scene.
 *
 * On a phone there is no immersive activity to hand off to, so the inline
 * navigator in `XrScreen` is the whole experience.
 */
export default function Xr(): React.JSX.Element {
  const router = useRouter();
  const onHeadset = getPicoRuntimeInfo().xrMode !== 'mobile';

  if (onHeadset) {
    return <XrLauncher onExit={() => router.back()} />;
  }
  return <XrScreen onBack={() => router.back()} />;
}
