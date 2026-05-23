/**
 * Viro-interop helpers for expo-pico-core.
 *
 * These config plugins make it possible to pair `@reactvision/react-viro`
 * (Quest renderer) with `expo-pico-core` so the app can ship on Meta Quest
 * and PICO OS 6 from the same APK.
 *
 * Status: experimental. See `docs/VIRO-ON-PICO.md` for the full Viro-on-PICO
 * compatibility report. The plugins here close the Android manifest gaps
 * that prevent Viro's OpenXR loader from finding PICO's system runtime —
 * a separate virocore C++ patch is required for end-to-end XR rendering
 * (see `patches/virocore/`).
 */
export { withPicoOpenXrLoader } from './withPicoOpenXrLoader';
