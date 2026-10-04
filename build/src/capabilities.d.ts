import type { PicoBodyJoint, PicoCapabilityName, PicoCapabilitySnapshotEntry, PicoController, PicoDeclaredCapabilities, PicoDetectedPlane, PicoEyePose, PicoFoveationLevel, PicoHandPose, PicoHighRateSensor, PicoMotionTracker } from './types';
/**
 * Unified capability runtime surface.
 *
 * This module is the public TypeScript contract for every capability the
 * prebuild plugin declares. Everything is optional at the device/SDK
 * layer: methods either return the real value (PICO device + SDK present)
 * or null / false (mobile emulator, non-PICO target, or SDK-less PICO
 * build).
 *
 * Consumer pattern:
 *
 *   if (await capabilities.isAvailable('eyeTracking')) {
 *     await capabilities.eye.enable();
 *     const pose = await capabilities.eye.getPose();
 *   }
 *
 * Grouped by domain for discoverability:
 *   - capabilities.declared       — plain mirror of the prebuild flags
 *   - capabilities.snapshot()     — full 3-layer snapshot of all caps
 *   - capabilities.isAvailable()  — single-shot query for one cap
 *   - capabilities.display        — refresh rate, foveation, passthrough
 *   - capabilities.eye            — eye tracking
 *   - capabilities.face           — face tracking
 *   - capabilities.body           — body tracking (Motion Tracker)
 *   - capabilities.hand           — hand tracking
 *   - capabilities.boundary       — Guardian / play-area boundary
 *   - capabilities.scene          — planes + scene mesh
 *   - capabilities.controllers    — controller state + haptics
 *   - capabilities.motionTracker  — Motion Tracker dongles
 *   - capabilities.sensors        — high-rate IMU sensors
 *   - capabilities.spatialAudio   — head-tracked HRTF engine
 */
/**
 * Plain mirror of what the prebuild plugin declared. Reads a BuildConfig
 * constant — cheap and synchronous. Useful for gating UI without waiting
 * for a native async call.
 */
export declare function getDeclaredCapabilities(): PicoDeclaredCapabilities;
/** Refresh rates (Hz) declared at prebuild time. Empty when none. */
export declare function getDeclaredRefreshRates(): number[];
/** PICO device codenames declared in `targetDevices`. Empty when unconstrained. */
export declare function getDeclaredTargetDevices(): string[];
/**
 * Full three-layer capability snapshot (declared × systemFeature × sdk).
 * Preferred entry point for a diagnostics panel.
 */
export declare function getCapabilitySnapshot(): Promise<PicoCapabilitySnapshotEntry[]>;
/**
 * Single-capability availability check. Returns `true` when declared,
 * device supports it, and the SDK class resolves; `false` when any
 * layer is missing; `null` when the capability name is unknown.
 */
export declare function isCapabilityAvailable(name: PicoCapabilityName): Promise<boolean | null>;
export declare const display: {
    /** Current display refresh rate in Hz. Null when SDK unavailable. */
    getCurrentRefreshRate(): Promise<number | null>;
    /** List of supported refresh rates. Null when SDK unavailable. */
    getSupportedRefreshRates(): Promise<number[] | null>;
    /**
     * Request a refresh rate. Returns true when the call was dispatched;
     * the OS may clamp to the closest supported value. Re-query
     * `getCurrentRefreshRate()` to confirm.
     */
    setRefreshRate(hz: number): Promise<boolean>;
    /** Current foveation level. Null when SDK unavailable. */
    getFoveationLevel(): Promise<PicoFoveationLevel | null>;
    /** Set foveation level. Returns true when the call was dispatched. */
    setFoveationLevel(level: PicoFoveationLevel): Promise<boolean>;
    /** Enable or disable passthrough. True when the call was dispatched. */
    setPassthroughEnabled(enabled: boolean): Promise<boolean>;
    /** Current passthrough state. Null when SDK unavailable. */
    isPassthroughActive(): Promise<boolean | null>;
};
export declare const eye: {
    enable(): Promise<boolean>;
    disable(): Promise<boolean>;
    /** Current gaze pose. Null when disabled or SDK unavailable. */
    getPose(): Promise<PicoEyePose | null>;
};
export declare const face: {
    enable(): Promise<boolean>;
    disable(): Promise<boolean>;
    /** Face blendshape weights 0..1, keyed by PICO's blendshape name. */
    getWeights(): Promise<Record<string, number> | null>;
};
export declare const body: {
    enable(): Promise<boolean>;
    disable(): Promise<boolean>;
    /** Per-joint pose list. Null when disabled or SDK unavailable. */
    getJoints(): Promise<PicoBodyJoint[] | null>;
};
export declare const hand: {
    enable(): Promise<boolean>;
    disable(): Promise<boolean>;
    /** Per-hand joint pose snapshot. Null when disabled or SDK unavailable. */
    getPose(): Promise<PicoHandPose | null>;
};
export declare const boundary: {
    /** Is the boundary outline currently visible? Null when SDK unavailable. */
    isVisible(): Promise<boolean | null>;
    /** Show or hide the boundary outline overlay. */
    setVisible(visible: boolean): Promise<boolean>;
    /**
     * Polygon vertices defining the boundary in tracking space. Each entry
     * is `[x, y, z]`. Empty list when "stationary" boundary (no polygon).
     * Null when SDK unavailable.
     */
    getGeometry(): Promise<number[][] | null>;
};
export declare const scene: {
    /** Detected plane list. Null when scene understanding unavailable. */
    getPlanes(): Promise<PicoDetectedPlane[] | null>;
    /** Request a new plane scan. Dispatch only — results arrive on next `getPlanes()`. */
    refreshPlanes(): Promise<boolean>;
    /** Trigger a scene-mesh rescan. */
    refreshMesh(): Promise<boolean>;
    /** Triangle count reported by the last mesh scan. Null when unavailable. */
    getMeshTriangleCount(): Promise<number | null>;
};
export declare const controllers: {
    /** Connected controllers (battery, hand, model). */
    list(): Promise<PicoController[] | null>;
    /**
     * Fire a haptic pulse on one controller. `amplitude` 0..1, `durationMs`
     * >= 0. Silently no-ops when controllerHaptics is unavailable.
     */
    triggerHaptic(side: "left" | "right", amplitude: number, durationMs: number): Promise<boolean>;
};
export declare const motionTracker: {
    /** Attached Motion Tracker dongles with pose + battery. */
    list(): Promise<PicoMotionTracker[] | null>;
};
export declare const sensors: {
    /**
     * IMU sensor rate report. Reflects actual device capability; won't
     * exceed 200Hz on devices where HIGH_SAMPLING_RATE_SENSORS is not
     * honored even with the permission granted.
     */
    getHighRate(): Promise<PicoHighRateSensor[]>;
};
export declare const spatialAudio: {
    isEnabled(): Promise<boolean | null>;
    setEnabled(enabled: boolean): Promise<boolean>;
    /** PICO HRTF profile name ("default", "personal", etc.). */
    getHrtfProfile(): Promise<string | null>;
};
export declare const capabilities: {
    getDeclared: typeof getDeclaredCapabilities;
    getDeclaredRefreshRates: typeof getDeclaredRefreshRates;
    getDeclaredTargetDevices: typeof getDeclaredTargetDevices;
    getSnapshot: typeof getCapabilitySnapshot;
    isAvailable: typeof isCapabilityAvailable;
    display: {
        /** Current display refresh rate in Hz. Null when SDK unavailable. */
        getCurrentRefreshRate(): Promise<number | null>;
        /** List of supported refresh rates. Null when SDK unavailable. */
        getSupportedRefreshRates(): Promise<number[] | null>;
        /**
         * Request a refresh rate. Returns true when the call was dispatched;
         * the OS may clamp to the closest supported value. Re-query
         * `getCurrentRefreshRate()` to confirm.
         */
        setRefreshRate(hz: number): Promise<boolean>;
        /** Current foveation level. Null when SDK unavailable. */
        getFoveationLevel(): Promise<PicoFoveationLevel | null>;
        /** Set foveation level. Returns true when the call was dispatched. */
        setFoveationLevel(level: PicoFoveationLevel): Promise<boolean>;
        /** Enable or disable passthrough. True when the call was dispatched. */
        setPassthroughEnabled(enabled: boolean): Promise<boolean>;
        /** Current passthrough state. Null when SDK unavailable. */
        isPassthroughActive(): Promise<boolean | null>;
    };
    eye: {
        enable(): Promise<boolean>;
        disable(): Promise<boolean>;
        /** Current gaze pose. Null when disabled or SDK unavailable. */
        getPose(): Promise<PicoEyePose | null>;
    };
    face: {
        enable(): Promise<boolean>;
        disable(): Promise<boolean>;
        /** Face blendshape weights 0..1, keyed by PICO's blendshape name. */
        getWeights(): Promise<Record<string, number> | null>;
    };
    body: {
        enable(): Promise<boolean>;
        disable(): Promise<boolean>;
        /** Per-joint pose list. Null when disabled or SDK unavailable. */
        getJoints(): Promise<PicoBodyJoint[] | null>;
    };
    hand: {
        enable(): Promise<boolean>;
        disable(): Promise<boolean>;
        /** Per-hand joint pose snapshot. Null when disabled or SDK unavailable. */
        getPose(): Promise<PicoHandPose | null>;
    };
    boundary: {
        /** Is the boundary outline currently visible? Null when SDK unavailable. */
        isVisible(): Promise<boolean | null>;
        /** Show or hide the boundary outline overlay. */
        setVisible(visible: boolean): Promise<boolean>;
        /**
         * Polygon vertices defining the boundary in tracking space. Each entry
         * is `[x, y, z]`. Empty list when "stationary" boundary (no polygon).
         * Null when SDK unavailable.
         */
        getGeometry(): Promise<number[][] | null>;
    };
    scene: {
        /** Detected plane list. Null when scene understanding unavailable. */
        getPlanes(): Promise<PicoDetectedPlane[] | null>;
        /** Request a new plane scan. Dispatch only — results arrive on next `getPlanes()`. */
        refreshPlanes(): Promise<boolean>;
        /** Trigger a scene-mesh rescan. */
        refreshMesh(): Promise<boolean>;
        /** Triangle count reported by the last mesh scan. Null when unavailable. */
        getMeshTriangleCount(): Promise<number | null>;
    };
    controllers: {
        /** Connected controllers (battery, hand, model). */
        list(): Promise<PicoController[] | null>;
        /**
         * Fire a haptic pulse on one controller. `amplitude` 0..1, `durationMs`
         * >= 0. Silently no-ops when controllerHaptics is unavailable.
         */
        triggerHaptic(side: "left" | "right", amplitude: number, durationMs: number): Promise<boolean>;
    };
    motionTracker: {
        /** Attached Motion Tracker dongles with pose + battery. */
        list(): Promise<PicoMotionTracker[] | null>;
    };
    sensors: {
        /**
         * IMU sensor rate report. Reflects actual device capability; won't
         * exceed 200Hz on devices where HIGH_SAMPLING_RATE_SENSORS is not
         * honored even with the permission granted.
         */
        getHighRate(): Promise<PicoHighRateSensor[]>;
    };
    spatialAudio: {
        isEnabled(): Promise<boolean | null>;
        setEnabled(enabled: boolean): Promise<boolean>;
        /** PICO HRTF profile name ("default", "personal", etc.). */
        getHrtfProfile(): Promise<string | null>;
    };
};
//# sourceMappingURL=capabilities.d.ts.map