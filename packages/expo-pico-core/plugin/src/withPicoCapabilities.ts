import type { AndroidConfig } from '@expo/config-plugins';

import {
  MANIFEST_META,
  PICO_FEATURES,
  PICO_PERMISSIONS,
} from './constants';
import type { ResolvedPicoOptions } from './types';

/**
 * Hardware capability manifest mutation for the PICO-flavor manifest.
 *
 * Emits `uses-feature`, `uses-permission`, and `<application>`-level
 * `meta-data` entries for the capabilities the consumer opted into:
 *
 *   - Eye tracking:        `pico.hardware.eyetracking`  + `com.picovr.permission.EYE_TRACKING`
 *   - Face tracking:       `pico.hardware.facetracking` + `com.picovr.permission.FACE_TRACKING`
 *   - Body tracking:       `pico.hardware.bodytracking` + `com.picovr.permission.BODY_TRACKING`   (seam)
 *   - Spatial audio:       `pico.hardware.spatialaudio`                                            (seam)
 *   - Foveated rendering:  `pico.hardware.foveation` + `com.pico.foveation.enabled` meta-data     (seam)
 *   - High sampling rate:  `android.permission.HIGH_SAMPLING_RATE_SENSORS`
 *   - Refresh rates:       `com.pico.refreshRates` meta-data with comma-separated Hz values        (seam)
 *
 * All `uses-feature` entries are emitted with `android:required="false"`
 * so a device that lacks the capability still installs the APK — the
 * consumer is expected to gate runtime usage on
 * `PackageManager.hasSystemFeature(...)`.
 *
 * Idempotent: each entry is keyed by `android:name`, so re-apply updates
 * in place rather than duplicating. Capabilities that are toggled off
 * between prebuilds are removed from the manifest.
 *
 * Note: this helper is the capability *declaration* layer. Native
 * bindings to the corresponding PICO SDK surfaces (eye-gaze provider,
 * face-tracker callbacks, refresh-rate setter) remain extension seams
 * in `PicoOs6Runtime` / sibling packages.
 */
export function applyCapabilityContract(
  manifest: AndroidConfig.Manifest.AndroidManifest,
  options: ResolvedPicoOptions
): AndroidConfig.Manifest.AndroidManifest {
  const features = ensureArray(manifest.manifest, 'uses-feature');
  const permissions = ensureArray(manifest.manifest, 'uses-permission');
  const application = ensureApplication(manifest);
  const metaData = ensureArray(application, 'meta-data');

  // ── Features ────────────────────────────────────────────────────
  upsertFeature(features, PICO_FEATURES.EYE_TRACKING, options.eyeTracking);
  upsertFeature(features, PICO_FEATURES.FACE_TRACKING, options.faceTracking);
  upsertFeature(features, PICO_FEATURES.BODY_TRACKING, options.bodyTracking);
  upsertFeature(features, PICO_FEATURES.SPATIAL_AUDIO, options.spatialAudio);
  upsertFeature(features, PICO_FEATURES.FOVEATION, options.foveatedRendering);
  upsertFeature(features, PICO_FEATURES.BOUNDARY, options.boundary);
  upsertFeature(features, PICO_FEATURES.SCENE_MESH, options.sceneMesh);

  // ── Permissions ─────────────────────────────────────────────────
  upsertPermission(permissions, PICO_PERMISSIONS.EYE_TRACKING, options.eyeTracking);
  upsertPermission(permissions, PICO_PERMISSIONS.FACE_TRACKING, options.faceTracking);
  upsertPermission(permissions, PICO_PERMISSIONS.BODY_TRACKING, options.bodyTracking);
  upsertPermission(permissions, PICO_PERMISSIONS.BOUNDARY, options.boundary);
  upsertPermission(
    permissions,
    PICO_PERMISSIONS.HIGH_SAMPLING_RATE_SENSORS,
    options.highSamplingRateSensors
  );

  // ── Meta-data ───────────────────────────────────────────────────
  upsertMeta(
    metaData,
    MANIFEST_META.FOVEATION_ENABLED,
    options.foveatedRendering ? 'true' : null
  );
  upsertMeta(
    metaData,
    MANIFEST_META.REFRESH_RATES,
    options.refreshRates.length > 0 ? options.refreshRates.join(',') : null
  );

  return manifest;
}

function upsertFeature(features: any[], name: string, enabled: boolean): void {
  const idx = features.findIndex((f: any) => f.$?.['android:name'] === name);
  if (!enabled) {
    if (idx !== -1) features.splice(idx, 1);
    return;
  }
  const entry = {
    $: { 'android:name': name, 'android:required': 'false' },
  };
  if (idx === -1) features.push(entry);
  else features[idx] = entry;
}

function upsertPermission(permissions: any[], name: string, enabled: boolean): void {
  const idx = permissions.findIndex((p: any) => p.$?.['android:name'] === name);
  if (!enabled) {
    // Do not remove permissions that carry `tools:node="remove"` — those
    // were written by buildPicoManifest's telephony-strip path and we
    // must not undo them here.
    if (idx !== -1 && permissions[idx].$?.['tools:node'] !== 'remove') {
      permissions.splice(idx, 1);
    }
    return;
  }
  const entry = { $: { 'android:name': name } };
  if (idx === -1) permissions.push(entry);
  else permissions[idx] = entry;
}

function upsertMeta(metaData: any[], name: string, value: string | null): void {
  const idx = metaData.findIndex((m: any) => m.$?.['android:name'] === name);
  if (value == null) {
    if (idx !== -1) metaData.splice(idx, 1);
    return;
  }
  const entry = { $: { 'android:name': name, 'android:value': value } };
  if (idx === -1) metaData.push(entry);
  else metaData[idx] = entry;
}

function ensureArray(node: Record<string, any>, key: string): any[] {
  if (!Array.isArray(node[key])) {
    node[key] = [];
  }
  return node[key];
}

function ensureApplication(
  manifest: AndroidConfig.Manifest.AndroidManifest
): any {
  manifest.manifest.application = manifest.manifest.application ?? [];
  if (manifest.manifest.application.length === 0) {
    manifest.manifest.application.push({ $: {} } as any);
  }
  return manifest.manifest.application[0];
}

export default applyCapabilityContract;
