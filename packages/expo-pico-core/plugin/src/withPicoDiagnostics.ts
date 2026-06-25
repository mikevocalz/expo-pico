import { ConfigPlugin, WarningAggregator } from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

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

const TAG = '@expo-pico/core';

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
export function runDiagnosticChecks(
  options: ResolvedPicoOptions,
  env: DiagnosticEnv = {}
): DiagnosticCheckFinding[] {
  const findings: DiagnosticCheckFinding[] = [];

  // 1. Immersive without identity — ERROR for PICO builds because the
  // PPS SDK rejects every call with 100008 "appkey is empty" when the
  // `pvr.app.id` meta-data is missing/blank.
  const hasAnyIdentity =
    options.platformService.hasIdentity ||
    (options.picoAppId?.trim().length ?? 0) > 0;
  if (
    options.xrMode !== 'mobile' &&
    options.appType !== '2d' &&
    !hasAnyIdentity
  ) {
    const envHint = process.env.PICO_APP_ID
      ? 'PICO_APP_ID env var is set but picoAppId resolved to empty — check that app.config reads it (e.g. `picoAppId: process.env.PICO_APP_ID`).'
      : 'PICO_APP_ID env var is NOT set in this shell. Either: (a) export PICO_APP_ID=<your-app-id> from .env.local before prebuild, or (b) hardcode picoAppId in the plugin config (NOT recommended — secrets in source).';
    findings.push({
      id: 'identity.missing',
      severity: 'error',
      message:
        `xrMode '${options.xrMode}' is an immersive build but picoAppId is empty. ` +
        'Every PPS call (account, IAP, achievements, leaderboards, social) will fail at runtime with PICO error 100008 "appkey is empty". ' +
        envHint,
    });
  }

  // 2. 2d appType with PICO xrMode
  if (options.xrMode !== 'mobile' && options.appType === '2d') {
    findings.push({
      id: 'appType.hidden-launcher',
      severity: 'info',
      message:
        `xrMode '${options.xrMode}' with appType '2d' builds a PICO-aware APK that will NOT appear in the PICO immersive launcher. ` +
        "If that's intentional (companion 2D app), ignore. Otherwise set appType to 'vr' or 'mr'.",
    });
  }

  // 3. Immersive appType but mobile buildVariant
  if (options.buildVariant === 'mobile' && options.appType !== '2d') {
    findings.push({
      id: 'build-variant.ignored-apptype',
      severity: 'warning',
      message:
        `buildVariant 'mobile' does not write a PICO flavor manifest, so appType '${options.appType}' has no effect. ` +
        "Set buildVariant to 'pico' or 'dual' to ship an immersive-enumerated APK.",
    });
  }

  // 4. XR capability toggles under mobile xrMode
  if (options.xrMode === 'mobile') {
    const immersiveToggles: Array<[keyof ResolvedPicoOptions, string]> = [
      ['handTracking', 'handTracking'],
      ['passthrough', 'passthrough'],
      ['sceneUnderstanding', 'sceneUnderstanding'],
      ['eyeTracking', 'eyeTracking'],
      ['faceTracking', 'faceTracking'],
      ['bodyTracking', 'bodyTracking'],
      ['foveatedRendering', 'foveatedRendering'],
      ['boundary', 'boundary'],
      ['sceneMesh', 'sceneMesh'],
    ];
    const enabled = immersiveToggles
      .filter(([key]) => Boolean(options[key]))
      .map(([, label]) => label);
    if (enabled.length > 0) {
      findings.push({
        id: 'capabilities.ignored-under-mobile',
        severity: 'warning',
        message:
          `xrMode 'mobile' does not write a PICO flavor manifest, so the following toggles have no effect: ${enabled.join(', ')}. ` +
          "Flip xrMode to 'pico-os5' or 'pico-swan' if you want these declared.",
      });
    }
  }

  // 5. Swan subproject with non-Swan xrMode
  if (
    options.xrMode !== 'pico-swan' &&
    options.picoSwan.swanRuntimeProject !== null
  ) {
    findings.push({
      id: 'swan.subproject-without-mode',
      severity: 'warning',
      message:
        `picoSwan.swanRuntimeProject is set but xrMode is '${options.xrMode}'. ` +
        "settings.gradle mutation is only applied under xrMode 'pico-swan'; the subproject path is ignored.",
    });
  }

  // 6. Refresh rates declared under mobile
  if (options.xrMode === 'mobile' && options.refreshRates.length > 0) {
    findings.push({
      id: 'refresh-rates.ignored-under-mobile',
      severity: 'warning',
      message:
        "xrMode 'mobile' does not emit com.pico.refreshRates meta-data. " +
        'The declared rates [' +
        options.refreshRates.join(', ') +
        "] are ignored. Flip xrMode to 'pico-os5' or 'pico-swan' if you want the compositor to see them.",
    });
  }

  // 7. expo-dev-client in an immersive PICO build. PICO's compositor can't
  // promote DevLauncherActivity onto the immersive HMD surface — logcat
  // spams "Will skip draw vr actvity" and the user sees a 2D launcher
  // window inside the VR shell, with no path to immersive. expo-horizon-core
  // ships zero dev-client in its example app for the same reason; the
  // documented workflow is `expo run:android --variant picoDebug` + Metro,
  // which gives you live JS reload without inserting a 2D launcher root.
  if (
    env.hasDevClient &&
    options.xrMode !== 'mobile' &&
    options.appType !== '2d'
  ) {
    findings.push({
      id: 'dev-client.immersive-clash',
      severity: 'warning',
      message:
        `expo-dev-client is declared in package.json alongside xrMode '${options.xrMode}' + appType '${options.appType}'. ` +
        "PICO's compositor refuses to draw the DevLauncherActivity on the immersive HMD surface, so the immersive launcher intent-filter is skipped and the app falls back to a 2D panel. " +
        'Recommended workflow (mirrors expo-horizon-core): remove expo-dev-client and use `expo run:android --variant picoDebug` + Metro for hot reload. ' +
        'Keep dev-client only if you intentionally want a 2D companion build.',
    });
  }

  // 8. Partial IAP identity
  const ps = options.platformService;
  const cnPartial = Boolean(ps.picoMerchantId) !== Boolean(ps.picoPayKey);
  const foreignPartial =
    Boolean(ps.foreign.picoMerchantId) !== Boolean(ps.foreign.picoPayKey);
  if (cnPartial || foreignPartial) {
    const regions: string[] = [];
    if (cnPartial) regions.push('CN');
    if (foreignPartial) regions.push('Global/foreign');
    findings.push({
      id: 'iap.partial-identity',
      severity: 'warning',
      message:
        `platformService IAP identity is partially populated (${regions.join(' + ')}). ` +
        'IAP requires both picoMerchantId and picoPayKey in each region you ship. ' +
        'The plugin still writes the partial strings; IAP calls will fail at runtime.',
    });
  }

  return findings;
}

/**
 * Config-plugin wrapper. Runs the pure reducer and forwards each
 * finding (info / warning) to `WarningAggregator` so they surface in
 * the standard Expo prebuild output. Never throws — errors in the
 * reducer's sense are still only warnings at the plugin layer
 * (throwing would abort `npx expo prebuild` with a stack trace which
 * is less useful than a clear warning pointing at the right setting).
 */
function detectDevClient(projectRoot: string): boolean {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
    );
    return Boolean(
      pkg.dependencies?.['expo-dev-client'] ||
        pkg.devDependencies?.['expo-dev-client']
    );
  } catch {
    return false;
  }
}

export const withPicoDiagnostics: ConfigPlugin<ResolvedPicoOptions> = (
  config,
  options
) => {
  const projectRoot = (config as { _internal?: { projectRoot?: string } })._internal?.projectRoot ?? process.cwd();
  const env: DiagnosticEnv = { hasDevClient: detectDevClient(projectRoot) };
  for (const finding of runDiagnosticChecks(options, env)) {
    WarningAggregator.addWarningAndroid(TAG, finding.message);
  }
  return config;
};

export default withPicoDiagnostics;
