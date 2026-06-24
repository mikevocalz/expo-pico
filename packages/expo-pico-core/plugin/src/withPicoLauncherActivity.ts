import type { AndroidConfig } from '@expo/config-plugins';

import {
  APP_TYPE_MANIFEST_VALUE,
  LAUNCHER_CATEGORIES,
  MANIFEST_META,
  PICO_QUERY_PACKAGES,
} from './constants';
import type { ResolvedPicoOptions } from './types';

/**
 * Reference to the Expo template's launcher activity name. The Expo
 * Application Project always emits a `.MainActivity` for the user app, so
 * we target it with a relative reference. The `package` attribute on the
 * `<manifest>` root is what resolves it.
 */
const MAIN_ACTIVITY_NAME = '.MainActivity';

/**
 * In-place launcher contract mutation for the PICO-flavor AndroidManifest.
 *
 * Three additions, each independently gated on the resolved `appType`:
 *
 *   1. `<meta-data android:name="pvr.app.type" .../>` at <application>
 *      scope. Required by PICO OS 6 to enumerate the APK as immersive
 *      (`vr`/`mr`) vs 2D fallback. Source: PICO OpenXR Mobile SDK Ch. 4.
 *
 *   2. An additional `<intent-filter>` on `.MainActivity` that re-declares
 *      `MAIN`+`LAUNCHER` and adds the immersive categories
 *      (`org.khronos.openxr.intent.category.IMMERSIVE_HMD` plus the PICO
 *      modern + legacy launcher categories). Adding a *separate*
 *      intent-filter — rather than trying to mutate the existing one — is
 *      the only reliable way to add categories to a launchable activity
 *      via the manifest merger. Both intent-filters end up on the merged
 *      activity; the PICO/OpenXR launcher matches the one with its
 *      category, and the standard 2D launcher matches the original.
 *
 *   3. A `<queries>` block at manifest root listing the PICO system
 *      packages an immersive app needs to bind to once
 *      `targetSdkVersion >= 30`. Without these, system-service binders
 *      silently fail on Android 11+.
 *
 * All three mutations are idempotent: re-applying with the same options
 * does not duplicate meta-data, intent-filters, categories, or query
 * package entries.
 *
 * Note on scope: this function is the launcher contract layer. The
 * provisional `com.pico.spatial.mode` / `com.pico.swan.spatialContainer`
 * meta-data emitted by buildPicoManifest is unrelated and is left
 * untouched here — those keys are spatial-runtime hints, not the
 * launcher-enumeration contract.
 */
export function applyLauncherContract(
  manifest: AndroidConfig.Manifest.AndroidManifest,
  options: ResolvedPicoOptions
): AndroidConfig.Manifest.AndroidManifest {
  if (options.appType === '2d') {
    return manifest;
  }

  ensureToolsNamespace(manifest);
  upsertAppType(manifest, options);
  // Only `vr` apps want the immersive launcher categories on MainActivity.
  // MR apps run as a passthrough spatial window — adding
  // `org.khronos.openxr.intent.category.IMMERSIVE_HMD` /
  // `com.pico.intent.category.VR` to MainActivity causes PICO to route the
  // app through the SeeThrough boundary wizard at every cold launch and
  // hand the immersive HMD surface to MainActivity, which a React Native
  // 2D root view cannot fulfill. The Viro plugin already declares a
  // separate `VRActivity` with these categories — that's what gets started
  // when `<ViroVRSceneNavigator>` mounts at user request.
  if (options.appType === 'vr') {
    addLauncherIntentFilter(manifest);
  }
  addPicoSystemQueries(manifest);

  return manifest;
}

/**
 * The PICO-flavor manifest already declares `xmlns:tools` in
 * withPicoAndroidManifest.buildPicoManifest, but defensively ensure it is
 * present so this helper composes correctly when used standalone (and so
 * the test suite does not have to depend on buildPicoManifest's seed
 * structure).
 */
function ensureToolsNamespace(manifest: AndroidConfig.Manifest.AndroidManifest): void {
  const root = manifest.manifest;
  root.$ = root.$ ?? ({} as any);
  if (!root.$['xmlns:tools']) {
    root.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  }
  if (!root.$['xmlns:android']) {
    root.$['xmlns:android'] = 'http://schemas.android.com/apk/res/android';
  }
}

function upsertAppType(
  manifest: AndroidConfig.Manifest.AndroidManifest,
  options: ResolvedPicoOptions
): void {
  const application = ensureApplication(manifest);
  application['meta-data'] = application['meta-data'] ?? [];
  const value = APP_TYPE_MANIFEST_VALUE[options.appType] ?? options.appType;
  const existing = application['meta-data'].find(
    (m: any) => m.$?.['android:name'] === MANIFEST_META.PVR_APP_TYPE
  );
  if (existing) {
    existing.$['android:value'] = value;
  } else {
    application['meta-data'].push({
      $: { 'android:name': MANIFEST_META.PVR_APP_TYPE, 'android:value': value },
    } as any);
  }
}

function addLauncherIntentFilter(
  manifest: AndroidConfig.Manifest.AndroidManifest
): void {
  const application = ensureApplication(manifest);
  application.activity = application.activity ?? [];

  let activity = application.activity.find(
    (a: any) => a.$?.['android:name'] === MAIN_ACTIVITY_NAME
  );
  if (!activity) {
    activity = {
      $: { 'android:name': MAIN_ACTIVITY_NAME, 'tools:node': 'merge' },
    } as any;
    application.activity.push(activity);
  }

  (activity as any)['intent-filter'] = (activity as any)['intent-filter'] ?? [];

  // We identify "our" intent-filter by the marker category
  // OPENXR_IMMERSIVE_HMD — that category is unique to immersive apps and is
  // a reliable signal that the filter was emitted by this plugin on a
  // previous prebuild. We replace the filter rather than mutate it in
  // place so toggling appType (vr ↔ mr) doesn't leave stale categories.
  const existingIdx = ((activity as any)['intent-filter'] as any[]).findIndex(
    (f: any) =>
      Array.isArray(f.category) &&
      f.category.some(
        (c: any) =>
          c.$?.['android:name'] === LAUNCHER_CATEGORIES.OPENXR_IMMERSIVE_HMD
      )
  );

  const newFilter = buildImmersiveIntentFilter();
  if (existingIdx === -1) {
    (activity as any)['intent-filter'].push(newFilter);
  } else {
    (activity as any)['intent-filter'][existingIdx] = newFilter;
  }
}

function buildImmersiveIntentFilter(): any {
  return {
    action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
    category: [
      { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
      { $: { 'android:name': LAUNCHER_CATEGORIES.OPENXR_IMMERSIVE_HMD } },
      { $: { 'android:name': LAUNCHER_CATEGORIES.PICO_VR } },
      { $: { 'android:name': LAUNCHER_CATEGORIES.PICOVR_VR_LEGACY } },
    ],
  };
}

function addPicoSystemQueries(
  manifest: AndroidConfig.Manifest.AndroidManifest
): void {
  const root = manifest.manifest;
  // The xml2js shape for <queries> is an array of query nodes; each query
  // node has a `package` array. We treat the first entry as the canonical
  // queries node and append package entries to it, deduping by
  // android:name.
  const queriesArr = (root as any).queries as any[] | undefined;
  let queryNode: any;
  if (!queriesArr || queriesArr.length === 0) {
    queryNode = { package: [] };
    (root as any).queries = [queryNode];
  } else {
    queryNode = queriesArr[0];
    queryNode.package = queryNode.package ?? [];
  }

  for (const pkg of PICO_QUERY_PACKAGES) {
    const exists = queryNode.package.some(
      (p: any) => p.$?.['android:name'] === pkg
    );
    if (!exists) {
      queryNode.package.push({ $: { 'android:name': pkg } });
    }
  }
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

export default applyLauncherContract;
