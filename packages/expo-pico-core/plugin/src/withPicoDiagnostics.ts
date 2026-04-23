import { ConfigPlugin, WarningAggregator } from '@expo/config-plugins';

import type { ResolvedPicoOptions } from './types';

const TAG = 'expo-pico-core';

/**
 * Prebuild diagnostic pass.
 *
 * Emits `WarningAggregator` warnings (same mechanism Expo uses for soft
 * config-plugin errors) when the resolved options describe a configuration
 * that builds but will not behave as the consumer likely expects. No
 * errors are thrown — the pattern matches `withPicoNewArchCheck` and the
 * broader Expo config-plugin convention.
 *
 * Covered checks:
 *
 *   1. Immersive app without platform identity.
 *      xrMode is 'pico-os6' or 'pico-swan' and `appType !== '2d'` but no
 *      `picoAppId` / `platformService.picoAppId` is set. The APK will
 *      build, install, and launch, but any call into the Platform SDK
 *      (account, IAP, achievements, leaderboards, notifications) will
 *      return "SDK unavailable" — a silent identity miss.
 *
 *   2. `appType: '2d'` with a PICO xrMode.
 *      The app will be built as PICO-aware but will not appear in the
 *      immersive section of the PICO launcher. Legitimate for companion
 *      2D apps; otherwise almost always a mistake. Emit as a heads-up.
 *
 *   3. `appType: 'vr'` / `'mr'` with `buildVariant: 'mobile'`.
 *      No flavor manifest is written at all in this case, so the
 *      launcher categories never land. The consumer is opting into a
 *      "pretend immersive" state that the plugin can't satisfy.
 *
 *   4. Hand-tracking, passthrough, or scene-understanding enabled under
 *      `xrMode: 'mobile'`. The flavor manifest that would declare the
 *      features isn't written, so the toggles are no-ops.
 *
 *   5. Swan subproject configured but `xrMode !== 'pico-swan'`.
 *      `picoSwan.swanRuntimeProject` is set but `xrMode` didn't opt into
 *      Swan — settings.gradle mutation is skipped, user may be
 *      confused.
 *
 *   6. Refresh rates declared with `xrMode: 'mobile'`.
 *      The meta-data lands in the flavor manifest which isn't written;
 *      no PICO OS compositor will ever see it.
 *
 *   7. IAP identity partially populated.
 *      Exactly one of `picoMerchantId` / `picoPayKey` is set. IAP won't
 *      work; either both or neither.
 *
 * Each warning message names the exact option(s) and the user-visible
 * consequence, and where applicable points at the fix. Messages are
 * kept under 220 characters so Expo's warning formatter stays readable.
 */
export const withPicoDiagnostics: ConfigPlugin<ResolvedPicoOptions> = (
  config,
  options
) => {
  const warn = (message: string): void =>
    WarningAggregator.addWarningAndroid(TAG, message);

  // 1. Immersive without identity
  const hasAnyIdentity =
    options.platformService.hasIdentity ||
    (options.picoAppId?.trim().length ?? 0) > 0;
  if (
    options.xrMode !== 'mobile' &&
    options.appType !== '2d' &&
    !hasAnyIdentity
  ) {
    warn(
      `xrMode '${options.xrMode}' is an immersive build but no picoAppId / platformService.picoAppId is set. ` +
        'Account / IAP / achievements / leaderboards will fail with "SDK unavailable". ' +
        'Set platformService.picoAppId (and picoAppKey) in your app.config plugin options.'
    );
  }

  // 2. 2d app type with PICO xrMode
  if (options.xrMode !== 'mobile' && options.appType === '2d') {
    warn(
      `xrMode '${options.xrMode}' with appType '2d' builds a PICO-aware APK that will NOT appear in the PICO immersive launcher. ` +
        "If that's intentional (companion 2D app), ignore this warning. Otherwise set appType to 'vr' or 'mr'."
    );
  }

  // 3. Immersive appType but mobile buildVariant
  if (options.buildVariant === 'mobile' && options.appType !== '2d') {
    warn(
      `buildVariant 'mobile' does not write a PICO flavor manifest, so appType '${options.appType}' has no effect. ` +
        "Set buildVariant to 'pico' or 'dual' to ship an immersive-enumerated APK."
    );
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
      warn(
        `xrMode 'mobile' does not write a PICO flavor manifest, so the following toggles have no effect: ${enabled.join(', ')}. ` +
          "Flip xrMode to 'pico-os6' or 'pico-swan' if you want these declared."
      );
    }
  }

  // 5. Swan subproject with non-Swan xrMode
  if (
    options.xrMode !== 'pico-swan' &&
    options.picoSwan.swanRuntimeProject !== null
  ) {
    warn(
      `picoSwan.swanRuntimeProject is set but xrMode is '${options.xrMode}'. ` +
        "settings.gradle mutation is only applied under xrMode 'pico-swan'; the subproject path is ignored."
    );
  }

  // 6. Refresh rates declared under mobile
  if (options.xrMode === 'mobile' && options.refreshRates.length > 0) {
    warn(
      `xrMode 'mobile' does not emit com.pico.refreshRates meta-data. ` +
        "The declared rates [" +
        options.refreshRates.join(', ') +
        "] are ignored. Flip xrMode to 'pico-os6' or 'pico-swan' if you want the compositor to see them."
    );
  }

  // 7. Partial IAP identity
  const ps = options.platformService;
  const cnPartial =
    Boolean(ps.picoMerchantId) !== Boolean(ps.picoPayKey);
  const foreignPartial =
    Boolean(ps.foreign.picoMerchantId) !== Boolean(ps.foreign.picoPayKey);
  if (cnPartial || foreignPartial) {
    const regions: string[] = [];
    if (cnPartial) regions.push('CN');
    if (foreignPartial) regions.push('Global/foreign');
    warn(
      `platformService IAP identity is partially populated (${regions.join(' + ')}). ` +
        'IAP requires both picoMerchantId and picoPayKey in each region you ship. ' +
        'The plugin still writes the partial strings; IAP calls will fail at runtime.'
    );
  }

  return config;
};

export default withPicoDiagnostics;
