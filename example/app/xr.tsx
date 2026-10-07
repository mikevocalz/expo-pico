import React from 'react';
import { useRouter } from 'expo-router';

import { XrScreen } from '../src/scene/XrScreen';

/**
 * Inline XR route.
 *
 * Headsets enter the immersive scene through `enterImmersiveScene()` from
 * HomeScreen, which starts VRActivity and renders the `VRQuestScene` root that
 * index.js registers. This route is the fallback when that fails: a phone, or
 * a build with no immersive activity.
 */
export default function Xr(): React.JSX.Element {
  const router = useRouter();
  return <XrScreen onBack={() => router.back()} />;
}
