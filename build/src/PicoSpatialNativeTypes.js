"use strict";
/**
 * Consolidates the five Expo Modules natives this package used to resolve
 * separately: ExpoPicoSpatial, ExpoPicoEyeGaze, ExpoPicoSceneMesh,
 * ExpoPicoFaceTracking and ExpoPicoBodyTracking. Availability stayed
 * per-surface, so each keeps its own `*Available` flag.
 *
 * Still Kotlin over the legacy PVR Spatial SDK AAR — a faithful port of the
 * current implementation. Moving these surfaces onto OpenXR extensions in C++
 * is a separate rewrite, and the one that would drop the proprietary
 * pico-spatial-sdk.aar requirement.
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=PicoSpatialNativeTypes.js.map