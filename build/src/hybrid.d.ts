import { PicoCore } from './PicoCore.nitro';
import { PicoRuntime } from './PicoRuntime.nitro';
export declare function resolvePicoCore(): PicoCore | null;
export declare function resolvePicoRuntime(): PicoRuntime | null;
/** Test seam: drops the cached instances so a suite can re-resolve. */
export declare function __resetPicoHybridCache(): void;
//# sourceMappingURL=hybrid.d.ts.map