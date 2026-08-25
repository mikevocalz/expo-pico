/**
 * Viro-interop helpers for expo-pico-core.
 *
 * These config plugins make it possible to pair `@reactvision/react-viro`
 * (Quest renderer) with `expo-pico-core` so the app can ship on Meta Quest
 * and PICO OS 6 from the same APK.
 *
 * Status: experimental. The plugins here close the Android manifest gaps that
 * prevent Viro's OpenXR loader from finding PICO's system runtime.
 *
 * The example app consumes the stock `@reactvision/react-viro` release from
 * npm — no fork, no `resolutions` entry, and no patches applied at install
 * time. Anything requiring changes to Viro's C++ renderer is therefore out of
 * scope here and belongs upstream at the ReactVision repo.
 */
export { withPicoOpenXrLoader } from './withPicoOpenXrLoader';
