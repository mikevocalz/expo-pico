"use strict";
/**
 * XR display, tracking, spatial, controller and sensor surfaces.
 *
 * Tuple types from the Expo Modules surface are structs here — Nitro has no
 * tuple. `[number,number,number]` became PicoVec3, `[number,number,number,
 * number]` PicoQuat, `[number,number]` PicoExtent. Same data, named fields.
 *
 * Every `| null` became an optional. Callers that checked `=== null` need to
 * check `=== undefined`.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=PicoRuntimeNativeTypes.js.map