export type PicoCapabilities = {
    account: boolean;
    iap: boolean;
    achievement: boolean;
    leaderboard: boolean;
    friend: boolean;
    push: boolean;
    social: boolean;
    rtc: boolean;
    storage: boolean;
    subscription: boolean;
    haptics: boolean;
    windowContainer: boolean;
    eyeGaze: boolean;
    sceneMesh: boolean;
    faceTracking: boolean;
    bodyTracking: boolean;
    spatialAudio: boolean;
    handTracking: boolean;
    passthrough: boolean;
    controllers: boolean;
};
export declare function getPicoCapabilities(): PicoCapabilities;
export declare function refreshPicoCapabilities(): PicoCapabilities;
export declare function logPicoCapabilities(): void;
//# sourceMappingURL=picoCapabilities.d.ts.map