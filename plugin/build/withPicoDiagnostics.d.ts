import { ConfigPlugin } from '@expo/config-plugins';
import type { ResolvedPicoOptions } from './types';
/**
 * Environment signals fed into the reducer alongside resolved options.
 * Kept separate so the reducer stays pure — tests pass an explicit
 * `env`; the config-plugin wrapper probes the project's package.json.
 */
export interface DiagnosticEnv {
    /**
     * True when `expo-dev-client` is declared (deps or devDeps) in the
     * consuming app's package.json. Drives the `dev-client.immersive-clash`
     * check — see `runDiagnosticChecks`.
     */
    hasDevClient?: boolean;
}
/**
 * One finding from the diagnostic reducer. Deliberately mirrors the
 * shape of `DiagnosticFinding` in the runtime diagnostics
 * (`src/types.ts`) so the CLI pretty-printer and the runtime
 * DiagnosticsPanel can render from the same structure.
 */
export interface DiagnosticCheckFinding {
    id: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
}
/**
 * Pure reducer: resolved plugin options → finding list. No side effects.
 *
 * Covered checks (each has a stable id):
 *
 *   1. `identity.missing` — xrMode is 'pico-os5' or 'pico-swan' and
 *      `appType !== '2d'` but no `picoAppId` /
 *      `platformService.picoAppId` is set. Platform SDK calls will
 *      silently fail at runtime.
 *
 *   2. `appType.hidden-launcher` — `appType: '2d'` with a PICO xrMode.
 *      APK builds as PICO-aware but won't appear in the immersive
 *      section of the PICO launcher. Legitimate for companion 2D apps.
 *
 *   3. `build-variant.ignored-apptype` — immersive `appType` with
 *      `buildVariant: 'mobile'`. No flavor manifest is written so the
 *      launcher categories never land.
 *
 *   4. `capabilities.ignored-under-mobile` — XR capability toggles
 *      (hand / passthrough / scene / eye / face / body / foveation /
 *      boundary / sceneMesh) enabled under `xrMode: 'mobile'`. Toggles
 *      have no effect; flavor manifest isn't written.
 *
 *   5. `swan.subproject-without-mode` — `picoSwan.swanRuntimeProject`
 *      set but `xrMode !== 'pico-swan'`. `settings.gradle` mutation is
 *      skipped.
 *
 *   6. `refresh-rates.ignored-under-mobile` — `refreshRates` declared
 *      under `xrMode: 'mobile'`. Meta-data never emitted.
 *
 *   7. `iap.partial-identity` — exactly one of `picoMerchantId` /
 *      `picoPayKey` set per region. IAP won't work — either both or
 *      neither.
 *
 * Message strings are kept under ~220 characters so Expo's warning
 * formatter stays readable when the same findings are forwarded to
 * `WarningAggregator` by the config-plugin wrapper below.
 *
 * Used by:
 *   - `withPicoDiagnostics` config plugin (prebuild warnings).
 *   - `expo-pico-doctor` CLI (standalone lint).
 *   - Any consumer that wants to surface these checks in custom tooling.
 */
export declare function runDiagnosticChecks(options: ResolvedPicoOptions, env?: DiagnosticEnv): DiagnosticCheckFinding[];
export declare const withPicoDiagnostics: ConfigPlugin<ResolvedPicoOptions>;
export default withPicoDiagnostics;
//# sourceMappingURL=withPicoDiagnostics.d.ts.map