import ExpoPicoModule from './ExpoPicoModule';
import type {
  DeclaredFeature,
  DeclaredPermission,
  DiagnosticFinding,
  DiagnosticSeverity,
  PicoDiagnosticsReport,
  PicoXRMode,
} from './types';

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
  os6RuntimeInitialized: boolean;
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
 * PICO system feature names we proactively probe at runtime so the
 * report can say "feature X was declared but the device doesn't have it"
 * without the caller having to enumerate them. Keep in sync with
 * `plugin/src/constants.ts` PICO_FEATURES — any entry added there
 * should be added here (or dropped when we switch to purely
 * declared-feature-driven probing, which is the current design).
 *
 * Note: we do not hardcode the *complete* feature list; we derive the
 * probe set from the merged manifest's `<uses-feature>` entries. This
 * set exists only as a fallback probe for features the compositor
 * advertises outside of the app's own manifest (e.g. headtracking
 * built into PICO OS that the app may want to verify even if its own
 * manifest doesn't name it).
 */
const AMBIENT_FEATURE_PROBES = [
  'android.hardware.vr.headtracking',
  'pico.hardware.handtracking',
  'pico.hardware.passthrough',
  'pico.hardware.eyetracking',
  'pico.hardware.facetracking',
  'pico.hardware.boundary',
  'pico.software.scene',
  'pico.software.scenemesh',
  'pico.software.spatialanchor',
] as const;

/**
 * Assemble build-time facts from the native module constants. Kept as
 * a separate function so the core reducer can be unit-tested with
 * synthetic input (the native module is not available in the jest
 * environment — see `__jest_stubs__/expo.js`).
 */
export function readBuildTimeFacts(): BuildTimeFacts {
  return {
    xrMode: normalizeXrMode(ExpoPicoModule.xrMode),
    appType: normalizeAppType(ExpoPicoModule.appType),
    isPicoDevice: Boolean(ExpoPicoModule.isPicoDevice),
    isPicoBuild: Boolean(ExpoPicoModule.isPicoBuild),
    hasPlatformIdentity: Boolean(ExpoPicoModule.hasPlatformIdentity),
    hasIapIdentity: Boolean(ExpoPicoModule.hasIapIdentity),
    swanRuntimeInitialized: Boolean(ExpoPicoModule.swanRuntimeInitialized),
    os6RuntimeInitialized: Boolean(ExpoPicoModule.os6RuntimeInitialized),
    picoAppId: ExpoPicoModule.picoAppId ?? null,
    picoAppKey: ExpoPicoModule.picoAppKey ?? null,
    deviceModel: ExpoPicoModule.deviceModel ?? null,
  };
}

/**
 * Fetch runtime facts from PackageManager. Probes `hasSystemFeature`
 * for every feature in the merged manifest plus the ambient fallback
 * set, so the reducer can build a full declared-vs-available diff.
 */
export async function readRuntimeFacts(): Promise<RuntimeFacts> {
  const [declaredFeatures, declaredPermissions] = await Promise.all([
    ExpoPicoModule.getDeclaredFeatures().catch(() => [] as DeclaredFeature[]),
    ExpoPicoModule.getDeclaredPermissions().catch(() => [] as DeclaredPermission[]),
  ]);

  const probeNames = new Set<string>([...AMBIENT_FEATURE_PROBES]);
  for (const f of declaredFeatures) {
    if (f.name) probeNames.add(f.name);
  }

  const probes = await Promise.all(
    Array.from(probeNames).map(async (name) => {
      try {
        return [name, await ExpoPicoModule.hasSystemFeature(name)] as const;
      } catch {
        return [name, false] as const;
      }
    })
  );

  const systemFeatureHits: Record<string, boolean> = {};
  for (const [name, hit] of probes) systemFeatureHits[name] = hit;

  return { declaredFeatures, declaredPermissions, systemFeatureHits };
}

/**
 * Pure reducer. Given build-time and runtime facts, produce a
 * {@link PicoDiagnosticsReport}. Exported so tests can assert on the
 * classification without spinning up the native bridge.
 */
export function buildDiagnosticsReport(
  build: BuildTimeFacts,
  runtime: RuntimeFacts
): PicoDiagnosticsReport {
  const findings: DiagnosticFinding[] = [];

  // ── Identity / platform ──────────────────────────────────────────
  if (build.xrMode !== 'mobile' && build.appType !== '2d' && !build.hasPlatformIdentity) {
    findings.push({
      id: 'identity.missing',
      severity: 'error',
      message: `Immersive build (xrMode=${build.xrMode}) has no platform identity.`,
      hint: 'Set platformService.picoAppId (and picoAppKey) in your app.config plugin options.',
    });
  }

  if (build.xrMode === 'pico-swan' && !build.swanRuntimeInitialized) {
    findings.push({
      id: 'swan.uninitialized',
      severity: 'info',
      message: 'xrMode=pico-swan but PicoSwanRuntime.initialize has not run yet.',
      hint:
        'Normal if you are reading diagnostics before MainApplication.onCreate resolves. ' +
        'If this persists, verify the PicoCorePackage registration in MainApplication.kt.',
    });
  }

  if (build.xrMode === 'pico-os6' && !build.os6RuntimeInitialized) {
    findings.push({
      id: 'os6.uninitialized',
      severity: 'info',
      message: 'xrMode=pico-os6 but PicoOs6Runtime.initialize has not run yet.',
    });
  }

  // ── Device / build match ─────────────────────────────────────────
  if (build.isPicoBuild && !build.isPicoDevice) {
    findings.push({
      id: 'build-device-mismatch',
      severity: 'warning',
      message:
        'This is a PICO-flavor build running on a non-PICO device. ' +
        'System features will be absent; most PICO modules will return "SDK unavailable".',
    });
  }

  if (!build.isPicoBuild && build.isPicoDevice) {
    findings.push({
      id: 'mobile-on-pico-device',
      severity: 'warning',
      message:
        'This is the mobile-flavor build running on PICO hardware. ' +
        'Consider building the pico flavor to get immersive features.',
    });
  }

  // ── Declared features vs. system feature availability ────────────
  const missing: string[] = [];
  for (const f of runtime.declaredFeatures) {
    const hit = runtime.systemFeatureHits[f.name];
    if (hit === false && f.required) {
      missing.push(f.name);
    }
  }
  for (const name of missing) {
    findings.push({
      id: `feature.missing:${name}`,
      severity: 'error',
      message: `Manifest requires feature "${name}" but the device does not report it.`,
      hint:
        'Either flip the uses-feature declaration to android:required="false" in the plugin ' +
        'option for this feature, or drop the option if the app does not actually use it.',
    });
  }

  // Optional features declared but missing — warn (not error).
  for (const f of runtime.declaredFeatures) {
    if (f.required) continue;
    const hit = runtime.systemFeatureHits[f.name];
    if (hit === false) {
      findings.push({
        id: `feature.optional-missing:${f.name}`,
        severity: 'info',
        message: `Optional feature "${f.name}" declared but not reported by device.`,
        hint: 'Guard runtime usage of this feature with hasSystemFeature().',
      });
    }
  }

  // ── Permissions ──────────────────────────────────────────────────
  for (const p of runtime.declaredPermissions) {
    if (p.granted) continue;
    // Skip permissions that carry tools:node="remove" semantics — those
    // can appear in the declared list as ungranted but were explicitly
    // stripped by the PICO-flavor manifest.
    if (p.name.includes('READ_PHONE_STATE') || p.name.includes('CALL_')) continue;
    findings.push({
      id: `permission.ungranted:${p.name}`,
      severity: 'info',
      message: `Permission "${p.name}" declared but not yet granted.`,
      hint:
        'Normal for runtime (dangerous) permissions. Call requestPermissionsAsync at the ' +
        'feature-use site before attempting to exercise the API that needs it.',
    });
  }

  // Stable ordering: severity (error > warning > info > ok), then id.
  findings.sort((a, b) => {
    const rank = (s: DiagnosticSeverity): number =>
      s === 'error' ? 0 : s === 'warning' ? 1 : s === 'info' ? 2 : 3;
    const d = rank(a.severity) - rank(b.severity);
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });

  return {
    summary: {
      hasError: findings.some((f) => f.severity === 'error'),
      hasWarning: findings.some((f) => f.severity === 'warning'),
      declaredFeatureCount: runtime.declaredFeatures.length,
      declaredPermissionCount: runtime.declaredPermissions.length,
      missingSystemFeatureCount: missing.length,
    },
    findings,
    raw: runtime,
  };
}

/**
 * End-to-end entry point. Reads build-time facts synchronously and
 * runtime facts asynchronously, then runs the pure reducer.
 */
export async function getPicoDiagnostics(): Promise<PicoDiagnosticsReport> {
  const build = readBuildTimeFacts();
  const runtime = await readRuntimeFacts();
  return buildDiagnosticsReport(build, runtime);
}

/**
 * Pretty-print a report for logs. Single-line per finding, severity
 * prefixed, hint rendered on a follow-up line. Useful in a
 * `console.log` during development or as the body of a diagnostics UI
 * panel.
 */
export function formatDiagnostics(report: PicoDiagnosticsReport): string {
  if (report.findings.length === 0) {
    return 'PICO diagnostics: no issues.\n' +
      `  declared features: ${report.summary.declaredFeatureCount}\n` +
      `  declared permissions: ${report.summary.declaredPermissionCount}`;
  }
  const lines = ['PICO diagnostics:'];
  for (const f of report.findings) {
    const prefix =
      f.severity === 'error'
        ? 'ERROR'
        : f.severity === 'warning'
          ? 'WARN '
          : f.severity === 'info'
            ? 'info '
            : 'ok   ';
    lines.push(`  [${prefix}] ${f.id} — ${f.message}`);
    if (f.hint) lines.push(`           ${f.hint}`);
  }
  return lines.join('\n');
}

function normalizeXrMode(value: string | null | undefined): PicoXRMode {
  if (value === 'pico-os6' || value === 'pico-swan') return value;
  return 'mobile';
}

function normalizeAppType(value: string | null | undefined): 'vr' | 'mr' | '2d' {
  if (value === 'vr' || value === 'mr') return value;
  return '2d';
}
