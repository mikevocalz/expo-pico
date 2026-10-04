import type { DeclaredFeature, DeclaredPermission, PicoDiagnosticsReport, PicoXRMode } from './types';
/**
 * Build-time facts read off the native module. The caller does not
 * typically construct this themselves — {@link getPicoDiagnostics} gets
 * it from the native module via BuildConfig mirroring. Exported so
 * tests can drive the pure reducer with fabricated input.
 */
export interface BuildTimeFacts {
    xrMode: PicoXRMode;
    appType: 'vr' | 'mr' | '2d';
    isPicoDevice: boolean;
    isPicoBuild: boolean;
    hasPlatformIdentity: boolean;
    hasIapIdentity: boolean;
    swanRuntimeInitialized: boolean;
    os5RuntimeInitialized: boolean;
    picoAppId: string | null;
    picoAppKey: string | null;
    deviceModel: string | null;
}
/**
 * Runtime facts read from PackageManager on Android.
 */
export interface RuntimeFacts {
    declaredFeatures: DeclaredFeature[];
    declaredPermissions: DeclaredPermission[];
    /** Per-feature-name lookup result from `PackageManager.hasSystemFeature`. */
    systemFeatureHits: Record<string, boolean>;
}
/**
 * Assemble build-time facts from the native module constants. Kept as
 * a separate function so the core reducer can be unit-tested with
 * synthetic input (the native module is not available in the jest
 * environment — see `__jest_stubs__/expo.js`).
 */
export declare function readBuildTimeFacts(): BuildTimeFacts;
/**
 * Fetch runtime facts from PackageManager. Probes `hasSystemFeature`
 * for every feature in the merged manifest plus the ambient fallback
 * set, so the reducer can build a full declared-vs-available diff.
 */
export declare function readRuntimeFacts(): Promise<RuntimeFacts>;
/**
 * Pure reducer. Given build-time and runtime facts, produce a
 * {@link PicoDiagnosticsReport}. Exported so tests can assert on the
 * classification without spinning up the native bridge.
 */
export declare function buildDiagnosticsReport(build: BuildTimeFacts, runtime: RuntimeFacts): PicoDiagnosticsReport;
/**
 * End-to-end entry point. Reads build-time facts synchronously and
 * runtime facts asynchronously, then runs the pure reducer.
 */
export declare function getPicoDiagnostics(): Promise<PicoDiagnosticsReport>;
/**
 * Pretty-print a report for logs. Single-line per finding, severity
 * prefixed, hint rendered on a follow-up line. Useful in a
 * `console.log` during development or as the body of a diagnostics UI
 * panel.
 */
export declare function formatDiagnostics(report: PicoDiagnosticsReport): string;
//# sourceMappingURL=diagnostics.d.ts.map