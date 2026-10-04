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
/** True when expo-location is linked in this build. */
export declare function isLocationAvailable(): boolean;
/**
 * Request foreground location permission. Returns true if granted.
 * Safe to call repeatedly — the OS no-ops once granted.
 */
export declare function requestLocationPermission(): Promise<boolean>;
/**
 * Get the current device location as `{ latitude, longitude }`.
 *
 * Requests permission if needed. Prefers the last known fix (instant, good
 * enough for region/weather); falls back to a fresh low-accuracy read. Returns
 * `null` when expo-location is absent, permission is denied, or no fix is
 * available — callers should handle null rather than assume a position.
 */
export declare function getPicoLocation(): Promise<PicoCoordinates | null>;
//# sourceMappingURL=location.d.ts.map