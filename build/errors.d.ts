/**
 * Shared error taxonomy for the expo-pico SDK family.
 *
 * Rules:
 * - SERVICE_UNAVAILABLE: the native module or required SDK service is unavailable.
 * - NOT_IMPLEMENTED: method exists but native wiring is not yet complete (seam pending)
 * - NOT_SUPPORTED: feature is unavailable on this OS version or target profile
 * - BILLING_UNAVAILABLE / PURCHASE_*: shared across expo-pico-iap and expo-pico-subscription
 * - All packages use these codes exclusively — no package-local raw Error is permitted
 */
export declare const PicoErrorCode: {
    readonly SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE";
    readonly NOT_IMPLEMENTED: "NOT_IMPLEMENTED";
    readonly NOT_SUPPORTED: "NOT_SUPPORTED";
    readonly INITIALIZATION_FAILED: "INITIALIZATION_FAILED";
    readonly INVALID_ARGUMENT: "INVALID_ARGUMENT";
    readonly PERMISSION_DENIED: "PERMISSION_DENIED";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly TIMEOUT: "TIMEOUT";
    readonly BILLING_UNAVAILABLE: "BILLING_UNAVAILABLE";
    readonly PURCHASE_CANCELLED: "PURCHASE_CANCELLED";
    readonly PURCHASE_ALREADY_OWNED: "PURCHASE_ALREADY_OWNED";
    readonly PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND";
    readonly UNKNOWN: "UNKNOWN";
};
export type PicoErrorCode = (typeof PicoErrorCode)[keyof typeof PicoErrorCode];
export declare class PicoServiceError extends Error {
    readonly name = "PicoServiceError";
    readonly code: PicoErrorCode;
    readonly packageName: string;
    readonly methodName: string;
    readonly cause?: unknown;
    constructor(params: {
        code: PicoErrorCode;
        packageName: string;
        methodName: string;
        message: string;
        cause?: unknown;
    });
}
export declare function isPicoServiceError(err: unknown): err is PicoServiceError;
/**
 * Native module or SDK service not available in this build. Common causes:
 * mobile flavor active, an unavailable service on non-PICO hardware, or a
 * missing native module. Gradle resolves PPS dependencies during the Android
 * build. An unfinished native method must use NOT_IMPLEMENTED instead.
 * Thrown synchronously by guardService(), not by native bridge.
 */
export declare function serviceUnavailableError(pkg: string, method: string): PicoServiceError;
/**
 * Method exists in public API but native wiring is not yet complete.
 * Used for explicit seams that are deferred by design, not by unavailability.
 */
export declare function notImplementedError(pkg: string, method: string, docUrl: string): PicoServiceError;
/**
 * Feature is unsupported on this OS version, target profile, or device class.
 * Distinct from NOT_IMPLEMENTED — the feature may never be supported here.
 */
export declare function notSupportedError(pkg: string, method: string, reason: string): PicoServiceError;
/** Caller passed an invalid argument. */
export declare function invalidArgumentError(pkg: string, method: string, detail: string): PicoServiceError;
/**
 * Normalizes a native module rejection into a typed PicoServiceError.
 * Maps known PicoErrorCode strings. Nitro Kotlin rejections can arrive as
 * plain Error objects, so preserve the explicit NOT_IMPLEMENTED prefix used
 * by unfinished native APIs when there is no recognized structured code.
 */
export declare function nativeRejectionError(pkg: string, method: string, nativeCode: string, nativeMessage: string): PicoServiceError;
/**
 * Throws SERVICE_UNAVAILABLE synchronously if the service is not available.
 * Call at the top of every public method (sync and async) before touching native.
 */
export declare function guardService(isAvailable: boolean, pkg: string, method: string): void;
/**
 * Wraps a native Promise, normalizing any rejection into a PicoServiceError.
 * Every async method that calls into native must use this wrapper — never
 * catch native rejections inline.
 */
export declare function wrapNativeCall<T>(pkg: string, method: string, call: Promise<T>): Promise<T>;
//# sourceMappingURL=errors.d.ts.map