"use strict";
// Boot-time wiring. Call once from app/_layout.tsx inside a useEffect.
//
// 1. Builds the capability cache (synchronous probes against every
//    expo-pico-* native module). Subsequent calls to getPicoCapabilities()
//    return this snapshot — UI surfaces can read it without re-probing.
// 2. Logs the capability table once so dev builds surface which AARs
//    landed.
// 3. Asks the Pico Spatial SDK to apply the requested 2D panel
//    dimensions via setWindowContainerProperties. No-op when the
//    Spatial SDK AAR is absent; the manifest <layout> defaults apply
//    on first install and Pico caches the user's manual resize after
//    that.
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootPico = bootPico;
const picoCapabilities_1 = require("./picoCapabilities");
const picoSpatial_1 = require("./picoSpatial");
const picoStorage_1 = require("./picoStorage");
let booted = false;
async function bootPico(options = {}) {
    if (booted) {
        return (0, picoCapabilities_1.refreshPicoCapabilities)();
    }
    booted = true;
    const caps = (0, picoCapabilities_1.refreshPicoCapabilities)();
    if (__DEV__)
        (0, picoCapabilities_1.logPicoCapabilities)();
    // Fire-and-forget the panel resize. We don't await — if the legacy
    // PVR-prefixed Spatial SDK AAR isn't on the classpath, the call
    // rejects fast and we don't want to block boot on a network-ish
    // error path. (Distinct from the modern PPS Maven deps, which
    // expo-pico-core resolves automatically.)
    const { hydrateStorage, ...windowProps } = options;
    if (Object.keys(windowProps).length > 0) {
        (0, picoSpatial_1.setWindowContainerProperties)(windowProps).catch(() => {
            /* picoSpatial already warned once */
        });
    }
    // Warm the mmkv cache from Pico cloud storage so synchronous reads at
    // first render hit. Skipped when the storage capability isn't present
    // (mobile flavor, non-PICO host, or PPS storage Maven dep didn't
    // resolve at prebuild time).
    if (hydrateStorage !== false && caps.storage) {
        (0, picoStorage_1.hydrateFromCloud)().catch(() => {
            /* picoStorage swallows internally; this is just defensive */
        });
    }
    return caps;
}
//# sourceMappingURL=picoBoot.js.map