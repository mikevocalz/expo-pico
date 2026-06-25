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

import {
  refreshPicoCapabilities,
  logPicoCapabilities,
  type PicoCapabilities,
} from './picoCapabilities';
import { setWindowContainerProperties, type WindowProperties } from './picoSpatial';
import { hydrateFromCloud } from './picoStorage';

export type BootOptions = WindowProperties & {
  // Pull all @expo-pico/storage cloud entries into mmkv at boot so the
  // first synchronous read is a cache hit. Default true when the storage
  // capability is present; set false to skip if your app doesn't use it.
  hydrateStorage?: boolean;
};

let booted = false;

export async function bootPico(options: BootOptions = {}): Promise<PicoCapabilities> {
  if (booted) {
    return refreshPicoCapabilities();
  }
  booted = true;

  const caps = refreshPicoCapabilities();
  if (__DEV__) logPicoCapabilities();

  // Fire-and-forget the panel resize. We don't await — if the legacy
  // PVR-prefixed Spatial SDK AAR isn't on the classpath, the call
  // rejects fast and we don't want to block boot on a network-ish
  // error path. (Distinct from the modern PPS Maven deps, which
  // expo-pico-core resolves automatically.)
  const { hydrateStorage, ...windowProps } = options;
  if (Object.keys(windowProps).length > 0) {
    setWindowContainerProperties(windowProps).catch(() => {
      /* picoSpatial already warned once */
    });
  }

  // Warm the mmkv cache from Pico cloud storage so synchronous reads at
  // first render hit. Skipped when the storage capability isn't present
  // (mobile flavor, non-PICO host, or PPS storage Maven dep didn't
  // resolve at prebuild time).
  if (hydrateStorage !== false && caps.storage) {
    hydrateFromCloud().catch(() => {
      /* picoStorage swallows internally; this is just defensive */
    });
  }

  return caps;
}
