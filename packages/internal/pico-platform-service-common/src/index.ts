// ─── Errors ──────────────────────────────────────────────────────────────────
export {
  PicoErrorCode,
  PicoServiceError,
  isPicoServiceError,
  serviceUnavailableError,
  notImplementedError,
  notSupportedError,
  invalidArgumentError,
  nativeRejectionError,
  guardService,
  wrapNativeCall,
} from './errors';

// ─── Native module resolution ─────────────────────────────────────────────────
export type { NativeModuleResolution } from './module-resolver';
export { resolveNativeModule } from './module-resolver';

// ─── Event helpers ────────────────────────────────────────────────────────────
export type { Subscription } from './event-helpers';
export {
  NULL_SUBSCRIPTION,
  createNativeEventEmitter,
  safeAddListener,
} from './event-helpers';

// ─── Pagination ───────────────────────────────────────────────────────────────
export type { PicoPage, PicoPageArgs } from './pagination';
export { DEFAULT_PAGE_SIZE } from './pagination';
