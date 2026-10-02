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

// ─── Expo Modules v2 resolution ──────────────────────────────────────────────
export type { NativeModuleResolution } from './module-resolver';
export { resolveNativeModule } from './module-resolver';

// ─── Transitional HybridObject resolution ─────────────────────────────────────────────────
export { resolveHybridObject, __resetHybridCache } from './hybrid-resolver';

// ─── Event helpers ───────────────────────────────────────────────────────────
export type { Subscription } from './event-helpers';
export { NULL_SUBSCRIPTION } from './event-helpers';
