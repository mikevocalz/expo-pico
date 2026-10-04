"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PicoServiceError = exports.PicoErrorCode = void 0;
exports.isPicoServiceError = isPicoServiceError;
exports.serviceUnavailableError = serviceUnavailableError;
exports.notImplementedError = notImplementedError;
exports.notSupportedError = notSupportedError;
exports.invalidArgumentError = invalidArgumentError;
exports.nativeRejectionError = nativeRejectionError;
exports.guardService = guardService;
exports.wrapNativeCall = wrapNativeCall;
/**
 * Shared error taxonomy for the expo-pico SDK family.
 *
 * Rules:
 * - SERVICE_UNAVAILABLE: SDK class not found in this build. Typically: mobile flavor active, non-PICO host, Gradle couldn't resolve PPS Maven artifacts, or (for legacy PVR surfaces only) the legacy PVR AAR wasn't dropped in.
 * - NOT_IMPLEMENTED: method exists but native wiring is not yet complete (seam pending)
 * - NOT_SUPPORTED: feature is unavailable on this OS version or target profile
 * - BILLING_UNAVAILABLE / PURCHASE_*: shared across expo-pico-iap and expo-pico-subscription
 * - All packages use these codes exclusively — no package-local raw Error is permitted
 */
exports.PicoErrorCode = {
    // ─── Service availability ──────────────────────────────────────────────────
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
    NOT_SUPPORTED: 'NOT_SUPPORTED',
    // ─── SDK lifecycle ────────────────────────────────────────────────────────
    INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
    // ─── Caller errors ────────────────────────────────────────────────────────
    INVALID_ARGUMENT: 'INVALID_ARGUMENT',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    // ─── Transport ────────────────────────────────────────────────────────────
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    // ─── Billing (shared: expo-pico-iap + expo-pico-subscription) ─────────────
    BILLING_UNAVAILABLE: 'BILLING_UNAVAILABLE',
    PURCHASE_CANCELLED: 'PURCHASE_CANCELLED',
    PURCHASE_ALREADY_OWNED: 'PURCHASE_ALREADY_OWNED',
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
    // ─── Fallback ─────────────────────────────────────────────────────────────
    UNKNOWN: 'UNKNOWN',
};
class PicoServiceError extends Error {
    constructor(params) {
        super(params.message);
        this.name = 'PicoServiceError';
        this.code = params.code;
        this.packageName = params.packageName;
        this.methodName = params.methodName;
        this.cause = params.cause;
        // Ensure correct prototype chain for instanceof checks
        Object.setPrototypeOf(this, PicoServiceError.prototype);
    }
}
exports.PicoServiceError = PicoServiceError;
function isPicoServiceError(err) {
    return err instanceof PicoServiceError;
}
// ─── Error factories ─────────────────────────────────────────────────────────
/**
 * SDK class not present in this build. Common causes: mobile flavor active,
 * running on non-PICO hardware, Gradle was offline at prebuild time (so PPS
 * Maven deps didn't resolve), or — for legacy PVR-only surfaces such as
 * `PXR_Plugin` haptics / passthrough and `expo-pico-spatial` — the legacy
 * PVR AAR wasn't dropped into `vendor/pico-sdk/` or `android/app/libs/`.
 * Thrown synchronously by guardService(), not by native bridge.
 */
function serviceUnavailableError(pkg, method) {
    return new PicoServiceError({
        code: exports.PicoErrorCode.SERVICE_UNAVAILABLE,
        packageName: pkg,
        methodName: method,
        message: `${pkg}: ${method}() requires the PICO Platform SDK, which is not present in this build`,
    });
}
/**
 * Method exists in public API but native wiring is not yet complete.
 * Used for explicit seams that are deferred by design, not by unavailability.
 */
function notImplementedError(pkg, method, docUrl) {
    return new PicoServiceError({
        code: exports.PicoErrorCode.NOT_IMPLEMENTED,
        packageName: pkg,
        methodName: method,
        message: `${pkg}: ${method}() is not yet implemented. See ${docUrl}`,
    });
}
/**
 * Feature is unsupported on this OS version, target profile, or device class.
 * Distinct from NOT_IMPLEMENTED — the feature may never be supported here.
 */
function notSupportedError(pkg, method, reason) {
    return new PicoServiceError({
        code: exports.PicoErrorCode.NOT_SUPPORTED,
        packageName: pkg,
        methodName: method,
        message: `${pkg}: ${method}() is not supported — ${reason}`,
    });
}
/** Caller passed an invalid argument. */
function invalidArgumentError(pkg, method, detail) {
    return new PicoServiceError({
        code: exports.PicoErrorCode.INVALID_ARGUMENT,
        packageName: pkg,
        methodName: method,
        message: `${pkg}: ${method}() invalid argument — ${detail}`,
    });
}
/**
 * Normalizes a native module rejection into a typed PicoServiceError.
 * Maps known PicoErrorCode strings; falls back to UNKNOWN for unrecognized codes.
 */
function nativeRejectionError(pkg, method, nativeCode, nativeMessage) {
    const code = exports.PicoErrorCode[nativeCode] ?? exports.PicoErrorCode.UNKNOWN;
    return new PicoServiceError({
        code,
        packageName: pkg,
        methodName: method,
        message: `${pkg}: ${method}() failed — ${nativeMessage}`,
    });
}
// ─── Guards ──────────────────────────────────────────────────────────────────
/**
 * Throws SERVICE_UNAVAILABLE synchronously if the service is not available.
 * Call at the top of every public method (sync and async) before touching native.
 */
function guardService(isAvailable, pkg, method) {
    if (!isAvailable)
        throw serviceUnavailableError(pkg, method);
}
/**
 * Wraps a native Promise, normalizing any rejection into a PicoServiceError.
 * Every async method that calls into native must use this wrapper — never
 * catch native rejections inline.
 */
function wrapNativeCall(pkg, method, call) {
    return call.catch((err) => {
        throw nativeRejectionError(pkg, method, err?.code ?? 'UNKNOWN', err?.message ?? 'Unknown native error');
    });
}
