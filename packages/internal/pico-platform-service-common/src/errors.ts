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
export const PicoErrorCode = {
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
} as const;

export type PicoErrorCode = (typeof PicoErrorCode)[keyof typeof PicoErrorCode];

export class PicoServiceError extends Error {
  override readonly name = 'PicoServiceError';
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
  }) {
    super(params.message);
    this.code = params.code;
    this.packageName = params.packageName;
    this.methodName = params.methodName;
    this.cause = params.cause;
    // Ensure correct prototype chain for instanceof checks
    Object.setPrototypeOf(this, PicoServiceError.prototype);
  }
}

export function isPicoServiceError(err: unknown): err is PicoServiceError {
  return err instanceof PicoServiceError;
}

// ─── Error factories ─────────────────────────────────────────────────────────

/**
 * Native module or SDK service not available in this build. Common causes:
 * mobile flavor active, an unavailable service on non-PICO hardware, or a
 * missing native module. Gradle resolves PPS dependencies during the Android
 * build. An unfinished native method must use NOT_IMPLEMENTED instead.
 * Thrown synchronously by guardService(), not by native bridge.
 */
export function serviceUnavailableError(pkg: string, method: string): PicoServiceError {
  return new PicoServiceError({
    code: PicoErrorCode.SERVICE_UNAVAILABLE,
    packageName: pkg,
    methodName: method,
    message: `${pkg}: ${method}() requires the PICO Platform SDK, which is not present in this build`,
  });
}

/**
 * Method exists in public API but native wiring is not yet complete.
 * Used for explicit seams that are deferred by design, not by unavailability.
 */
export function notImplementedError(pkg: string, method: string, docUrl: string): PicoServiceError {
  return new PicoServiceError({
    code: PicoErrorCode.NOT_IMPLEMENTED,
    packageName: pkg,
    methodName: method,
    message: `${pkg}: ${method}() is not yet implemented. See ${docUrl}`,
  });
}

/**
 * Feature is unsupported on this OS version, target profile, or device class.
 * Distinct from NOT_IMPLEMENTED — the feature may never be supported here.
 */
export function notSupportedError(pkg: string, method: string, reason: string): PicoServiceError {
  return new PicoServiceError({
    code: PicoErrorCode.NOT_SUPPORTED,
    packageName: pkg,
    methodName: method,
    message: `${pkg}: ${method}() is not supported — ${reason}`,
  });
}

/** Caller passed an invalid argument. */
export function invalidArgumentError(
  pkg: string,
  method: string,
  detail: string
): PicoServiceError {
  return new PicoServiceError({
    code: PicoErrorCode.INVALID_ARGUMENT,
    packageName: pkg,
    methodName: method,
    message: `${pkg}: ${method}() invalid argument — ${detail}`,
  });
}

/**
 * Normalizes a native module rejection into a typed PicoServiceError.
 * Maps known PicoErrorCode strings. Nitro Kotlin rejections can arrive as
 * plain Error objects, so preserve the explicit NOT_IMPLEMENTED prefix used
 * by unfinished native APIs when there is no recognized structured code.
 */
export function nativeRejectionError(
  pkg: string,
  method: string,
  nativeCode: string,
  nativeMessage: string
): PicoServiceError {
  const explicitCode =
    (PicoErrorCode as Record<string, PicoErrorCode>)[nativeCode] ?? PicoErrorCode.UNKNOWN;
  const code =
    explicitCode === PicoErrorCode.UNKNOWN &&
    /^(?:java\.lang\.IllegalStateException: )?NOT_IMPLEMENTED:/.test(nativeMessage)
      ? PicoErrorCode.NOT_IMPLEMENTED
      : explicitCode;
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
export function guardService(isAvailable: boolean, pkg: string, method: string): void {
  if (!isAvailable) throw serviceUnavailableError(pkg, method);
}

/**
 * Wraps a native Promise, normalizing any rejection into a PicoServiceError.
 * Every async method that calls into native must use this wrapper — never
 * catch native rejections inline.
 */
export function wrapNativeCall<T>(pkg: string, method: string, call: Promise<T>): Promise<T> {
  return call.catch((err: { code?: string; message?: string }) => {
    throw nativeRejectionError(
      pkg,
      method,
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Unknown native error'
    );
  });
}
