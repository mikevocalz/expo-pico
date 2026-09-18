/**
 * App entry.
 *
 * Two roots, because PICO runs the app as a flat 2D panel first and only hands
 * over the display to an immersive activity on demand:
 *
 *   "main"          — MainActivity, the 2D panel. Always the launch target.
 *   "VRQuestScene"  — VRActivity, entered only through ViroXRSceneNavigator.
 *
 * Viro registers "VRQuestScene" itself when `@reactvision/react-viro` is
 * imported, and that registration is the one to use. It maps to
 * `ViroQuestEntryPoint`, which reads the intent the navigator sets — the scene
 * to mount, the renderer flags, the `onExitViro` callback — and publishes the
 * view tag that `VRModuleOpenXR.getCapabilities()` resolves against.
 *
 * This file used to override that with `registerImmersiveScene(VrSceneRoot)`.
 * That was a workaround for stock Viro gating its intent path on `isQuest`,
 * which matches Oculus and Meta in `Build.MANUFACTURER`/`BRAND` and is false on
 * PICO — so nothing set the intent and VRActivity sat on a blank screen. This
 * fork gates on `isQuest || isPico` instead (`ViroXRSceneNavigator.tsx:253`),
 * so the intent path runs on PICO and the override is no longer needed.
 *
 * Keeping it would cost the things that hang off the entry point: scene
 * push/pop through the bridge, `onExitViro` on hardware back, and the view tag,
 * without which `getCapabilities()` has nothing to resolve and plane detection
 * reads as an indeterminate null.
 *
 * `registerImmersiveScene` remains available for apps that drive VRActivity
 * with a custom root instead of the navigator.
 */
import 'expo-router/entry';
