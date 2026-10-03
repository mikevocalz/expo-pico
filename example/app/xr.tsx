import React from 'react';
import { useRouter } from 'expo-router';

import { isQuest } from '@reactvision/react-viro';

import { XrLauncher } from '../src/scene/XrLauncher';
import { XrScreen } from '../src/scene/XrScreen';

/**
 * XR route.
 *
 * On Quest this mounts `ViroXRSceneNavigator` through `XrLauncher`, which sets
 * the scene intent and starts VRActivity. PICO never reaches it: HomeScreen
 * enters through `enterImmersiveScene()`, because stock react-viro only takes
 * the navigator's VR path on Quest branding and on PICO would mount
 * ViroARSceneNavigator (an ARCore install prompt).
 *
 * Everywhere else (a phone, or a build with no VR activity) the inline
 * navigator in `XrScreen` is the whole experience.
 */
export default function Xr(): React.JSX.Element {
  const router = useRouter();
  if (isQuest) {
    return <XrLauncher onExit={() => router.back()} />;
  }
  return <XrScreen onBack={() => router.back()} />;
}
