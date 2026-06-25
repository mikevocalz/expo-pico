/**
 * Viro-interop helpers for expo-pico-core.
 *
 * These config plugins make it possible to pair `@reactvision/react-viro`
 * (Quest renderer) with `expo-pico-core` so the app can ship on Meta Quest
 * and PICO OS 6 from the same APK.
 *
 * Status: experimental. See `docs/VIRO-ON-PICO.md` for the full Viro-on-PICO
 * compatibility report. The plugins here close the Android manifest gaps
 * that prevent Viro's OpenXR loader from finding PICO's system runtime; the
 * required C++ renderer changes ship as commits in the canonical fork at
 * github.com/mikevocalz/virocore (`v2.55.0-nitro-canvas`) — no patches are
 * applied at install time. `patches/virocore/README.md` enumerates which
 * historical patches map to which fork commits.
 */
export { withPicoOpenXrLoader } from './withPicoOpenXrLoader';
