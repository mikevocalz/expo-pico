/**
 * PICO location surface.
 *
 * Thin wrapper over `expo-location` — PICO OS is Android-based, so the stock
 * module works on device (unlike Horizon OS, which needs the forked
 * `expo-horizon-location`). This exists so PICO apps get a single, permission-
 * aware `getPicoLocation()` from `@expo-pico/core` instead of wiring
 * expo-location + its permission dance themselves.
 *
 * Coarse accuracy on purpose: a stationary headset on Wi-Fi resolves network
 * location fine, and city-level is all a weather/region lookup needs — fine GPS
 * is slower and often unavailable indoors.
 *
 * Degrades to `null` (never throws) when expo-location is absent or permission
 * is denied, mirroring the SDK-unavailable pattern used across this package.
 */

export interface PicoCoordinates {
  latitude: number;
  longitude: number;
}

// Minimal structural type for the slice of expo-location we use. Declaring it
// locally (rather than `typeof import('expo-location')`) keeps pico-core
// buildable when the optional peer isn't installed in this workspace.
interface ExpoLocationLike {
  requestForegroundPermissionsAsync(): Promise<{ status: string }>;
  getLastKnownPositionAsync(): Promise<{ coords: { latitude: number; longitude: number } } | null>;
  getCurrentPositionAsync(opts?: {
    accuracy?: number;
  }): Promise<{ coords: { latitude: number; longitude: number } }>;
  Accuracy: { Low: number };
}

// Resolve expo-location defensively — it's an optional peer, so a consumer
// could exclude it, and we never want an import to hard-crash a PICO app at load.
let _loc: ExpoLocationLike | null | undefined;
function loadLocation(): ExpoLocationLike | null {
  if (_loc !== undefined) return _loc;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _loc = require('expo-location') as ExpoLocationLike;
  } catch {
    _loc = null;
  }
  return _loc;
}

/** True when expo-location is linked in this build. */
export function isLocationAvailable(): boolean {
  return loadLocation() != null;
}

/**
 * Request foreground location permission. Returns true if granted.
 * Safe to call repeatedly — the OS no-ops once granted.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const loc = loadLocation();
  if (!loc) return false;
  const { status } = await loc.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Get the current device location as `{ latitude, longitude }`.
 *
 * Requests permission if needed. Prefers the last known fix (instant, good
 * enough for region/weather); falls back to a fresh low-accuracy read. Returns
 * `null` when expo-location is absent, permission is denied, or no fix is
 * available — callers should handle null rather than assume a position.
 */
export async function getPicoLocation(): Promise<PicoCoordinates | null> {
  const loc = loadLocation();
  if (!loc) return null;
  if (!(await requestLocationPermission())) return null;

  const last = await loc.getLastKnownPositionAsync();
  const pos =
    last ??
    (await loc.getCurrentPositionAsync({ accuracy: loc.Accuracy.Low }));
  if (!pos) return null;
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}
