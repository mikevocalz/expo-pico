/**
 * App entry.
 *
 * Two roots, because PICO runs the app as a flat 2D panel first and only hands
 * the display to an immersive activity on demand:
 *
 *   "main"          — MainActivity, the 2D panel. Always the launch target.
 *   "VRQuestScene"  — VRActivity, entered only via enterImmersiveScene().
 *
 * Not ViroXRSceneNavigator: stock react-viro routes it to VR only when
 * `isQuest` matches Oculus/Meta branding. On PICO (manufacturer "Pico") it
 * falls through to ViroARSceneNavigator, which asks the user to install
 * Google Play Services for AR and never opens VR.
 *
 * Both are registered here at module scope. The immersive root cannot wait for
 * a route to load it: entering XR starts VRActivity immediately, and a root
 * registered afterwards arrives too late — the activity mounts a component
 * that does not exist yet and sits on a blank loading screen.
 */
import 'expo-router/entry';
import { registerImmersiveScene } from '@expo-pico/core';

import { VrSceneRoot } from './src/scene/VrSceneRoot';

registerImmersiveScene(VrSceneRoot);
