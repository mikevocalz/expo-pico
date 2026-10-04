export type NativeModuleResolution<T extends object> = {
    available: true;
    nativeModule: T;
} | {
    available: false;
    nativeModule: null;
};
/**
 * Resolve an Expo Modules v2 native module without making non-PICO/mobile
 * builds fail at import time.
 */
export declare function resolveNativeModule<T extends object>(nativeModuleName: string): NativeModuleResolution<T>;
//# sourceMappingURL=module-resolver.d.ts.map