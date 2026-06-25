import type { AndroidConfig } from '@expo/config-plugins';

import type { ResolvedPicoOptions } from './types';

/**
 * Platform SDK activities the PICO login/payment SDK launches as part of
 * its in-app browser and OAuth flow. Both are declared with
 * `android:exported="false"` because they are only launched from within
 * the PICO Platform SDK process; they are not intended to receive
 * intents from other apps.
 *
 * Source: PICO Native SDK Ch. 7 (Payment) and PICO Platform Service
 * integration guide. Names are stable across SDK versions.
 */
const PICO_AUTH_ACTIVITY = 'com.pico.loginpaysdk.UnityAuthInterface';
const PICO_BROWSER_ACTIVITY = 'com.pico.loginpaysdk.component.PicoSDKBrowser';

/**
 * In-place PICO Platform Service manifest mutation for the flavor
 * manifest. Adds the two login/payment activities and the Platform SDK
 * BuildConfig-mirror meta-data.
 *
 * Gated on `options.platformService.declareActivities && hasIdentity`.
 *
 * Idempotent: activities are keyed on `android:name`, so a repeat apply
 * updates the element in place rather than duplicating.
 *
 * Note on scope: Platform SDK identity. The activities
 * exist so the Platform SDK auth/payment flows bind correctly. The
 * actual `CoreService.Initialize` call remains an extension seam in
 * `PicoOs5Runtime` / sibling packages — this plugin only ensures the
 * manifest surface is correct when the consumer wires up identity.
 */
export function applyPlatformServiceContract(
  manifest: AndroidConfig.Manifest.AndroidManifest,
  options: ResolvedPicoOptions
): AndroidConfig.Manifest.AndroidManifest {
  const ps = options.platformService;
  if (!ps.hasIdentity || !ps.declareActivities) {
    // Even with no identity, we still want to remove any stale activities
    // written by a previous prebuild in case the user just unset identity.
    removePlatformActivities(manifest);
    return manifest;
  }

  const application = ensureApplication(manifest);
  application.activity = application.activity ?? [];

  upsertActivity(application.activity, PICO_AUTH_ACTIVITY, {
    'android:name': PICO_AUTH_ACTIVITY,
    'android:exported': 'false',
    'tools:node': 'merge',
  });

  upsertActivity(application.activity, PICO_BROWSER_ACTIVITY, {
    'android:name': PICO_BROWSER_ACTIVITY,
    'android:exported': 'false',
    'tools:node': 'merge',
  });

  return manifest;
}

function upsertActivity(
  activities: any[],
  name: string,
  attributes: Record<string, string>
): void {
  const existing = activities.find((a: any) => a.$?.['android:name'] === name);
  if (existing) {
    existing.$ = { ...existing.$, ...attributes };
    return;
  }
  activities.push({ $: { ...attributes } });
}

function removePlatformActivities(
  manifest: AndroidConfig.Manifest.AndroidManifest
): void {
  const app = manifest.manifest.application?.[0];
  if (!app || !(app as any).activity) return;
  (app as any).activity = (app as any).activity.filter(
    (a: any) =>
      a.$?.['android:name'] !== PICO_AUTH_ACTIVITY &&
      a.$?.['android:name'] !== PICO_BROWSER_ACTIVITY
  );
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

export const PLATFORM_SERVICE_ACTIVITIES = {
  AUTH: PICO_AUTH_ACTIVITY,
  BROWSER: PICO_BROWSER_ACTIVITY,
} as const;

export default applyPlatformServiceContract;
