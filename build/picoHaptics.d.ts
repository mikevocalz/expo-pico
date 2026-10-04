export type HapticHand = 'left' | 'right' | 'both';
export declare const haptics: {
    tap: (hand?: HapticHand) => Promise<void>;
    confirm: (hand?: HapticHand) => Promise<void>;
    warn: (hand?: HapticHand) => Promise<void>;
    grab: (hand?: HapticHand) => Promise<void>;
    drop: (hand?: HapticHand) => Promise<void>;
    pulse: (hand: HapticHand, amplitude: number, durationMs: number) => Promise<void>;
    isAvailable: () => boolean;
};
//# sourceMappingURL=picoHaptics.d.ts.map