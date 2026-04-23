export type PicoSpatialMode =
  | '2d'
  | 'windowed'
  | 'shared-space'
  | 'full-space'
  | 'immersive'
  | 'volume';

export type PicoTargetProfileRuntime =
  | 'legacy'
  | 'pico4'
  | 'pico4ultra'
  | 'swan'
  | 'unknown';

/**
 * Active PICO XR platform mode (runtime view of the plugin-time `xrMode`
 * option). Mirrors the native `PicoXRPlatform` enum.
 *   - `mobile`:    Standard Android; no PICO runtime registered.
 *   - `pico-os6`:  Standard PICO OS 6 runtime active.
 *   - `pico-swan`: Project Swan / next-gen spatial runtime active.
 */
export type PicoXRMode = 'mobile' | 'pico-os6' | 'pico-swan';

export type PicoAppType = 'vr' | 'mr' | '2d';

export interface PicoRuntimeInfo {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: PicoSpatialMode;
  targetProfile: PicoTargetProfileRuntime;
  containerMode: 'window-container' | 'stage' | 'none';
  xrMode: PicoXRMode;
  appType: PicoAppType;
  picoAppId: string | null;
  picoAppKey: string | null;
  /** True when `platformService.picoAppId` or `picoAppKey` (or their foreign siblings) is set. */
  hasPlatformIdentity: boolean;
  /** True when both `picoMerchantId` and `picoPayKey` are set (one region is enough). */
  hasIapIdentity: boolean;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os6RuntimeInitialized: boolean;
}

export interface ExpoPicoModuleInterface {
  isPicoBuild: boolean;
  isPicoDevice: boolean;
  spatialMode: string;
  targetProfile: string;
  containerMode: string;
  xrMode: string;
  appType: string;
  picoAppId: string | null;
  picoAppKey: string | null;
  hasPlatformIdentity: boolean;
  hasIapIdentity: boolean;
  picoOsVersion: string | null;
  deviceModel: string | null;
  emulatorOptimizations: boolean;
  swanRuntimeInitialized: boolean;
  os6RuntimeInitialized: boolean;
  hasSystemFeature(name: string): Promise<boolean>;
  getDeclaredFeatures(): Promise<DeclaredFeature[]>;
  getDeclaredPermissions(): Promise<DeclaredPermission[]>;
}

export interface DeclaredFeature {
  name: string;
  required: boolean;
  glEsVersion?: string;
}

export interface DeclaredPermission {
  name: string;
  granted: boolean;
}

/**
 * Severity of a diagnostic finding. `ok` means the check passed;
 * `info` is an informational note; `warning` is a likely misconfig that
 * will still run; `error` is a state that will definitely fail at
 * runtime.
 */
export type DiagnosticSeverity = 'ok' | 'info' | 'warning' | 'error';

export interface DiagnosticFinding {
  /** Stable identifier — safe to branch on in code. */
  id: string;
  severity: DiagnosticSeverity;
  /** One-line human-readable summary. */
  message: string;
  /** Optional remediation hint. */
  hint?: string;
}

export interface PicoDiagnosticsReport {
  /** Summary booleans derived from the findings. */
  summary: {
    hasError: boolean;
    hasWarning: boolean;
    declaredFeatureCount: number;
    declaredPermissionCount: number;
    missingSystemFeatureCount: number;
  };
  /** Detail — ordered by severity then id. */
  findings: DiagnosticFinding[];
  /** Raw PackageManager output so consumers can build their own views. */
  raw: {
    declaredFeatures: DeclaredFeature[];
    declaredPermissions: DeclaredPermission[];
    systemFeatureHits: Record<string, boolean>;
  };
}
