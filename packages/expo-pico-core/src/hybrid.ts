import { PicoCore } from './PicoCore.nitro';
import { PicoRuntime } from './PicoRuntime.nitro';

// Nitro V1 removed NitroModules.createHybridObject, which
// @expo-pico/platform-service-common's resolveHybridObject still calls. Core
// constructs its own HybridObjects with V1 `new` and keeps that resolver's
// contract: one instance per runtime, or null when the native library is not
// registered (iOS, web, or a build without the Android library), so callers
// fall back to their native-absent defaults.

let core: PicoCore | null | undefined;
let runtime: PicoRuntime | null | undefined;

export function resolvePicoCore(): PicoCore | null {
  if (core === undefined) {
    try {
      core = new PicoCore();
    } catch {
      core = null;
    }
  }
  return core;
}

export function resolvePicoRuntime(): PicoRuntime | null {
  if (runtime === undefined) {
    try {
      runtime = new PicoRuntime();
    } catch {
      runtime = null;
    }
  }
  return runtime;
}

/** Test seam: drops the cached instances so a suite can re-resolve. */
export function __resetPicoHybridCache(): void {
  core = undefined;
  runtime = undefined;
}
