import {
  ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import {
  MANIFEST_META,
  PICO_FEATURES,
  DEVICE_TARGET_MAP,
  TARGET_PROFILE_MAP,
  PICO_PROHIBITED_PERMISSIONS,
  XR_MODE_MANIFEST_VALUE,
} from './constants';
import type { ResolvedPicoOptions } from './types';
import { resolveTargetProfile } from './types';
import { applyCapabilityContract } from './withPicoCapabilities';
import { applyLauncherContract } from './withPicoLauncherActivity';
import { applyPlatformServiceContract } from './withPicoPlatformService';

/**
 * Writes `pvr.app.id` (and other PPS-required metadata) into the **main**
 * AndroidManifest so every build flavor — `pico`, `quest`, `mobile`, `dual`
 * — sees it. The PICO Platform Service SDK reads it at first call via
 * `AppUtils.getAppIdFromManifest("pvr.app.id")`; if the active flavor's
 * merged manifest doesn't have it, the server rejects with 100008
 * "appkey is empty".
 *
 * Idempotent via `tools:node="replace"` semantics on the meta-data tag.
 */
export const withPicoPlatformServiceMainManifest: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  if (!options.picoAppId) return config;
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    const metaData = (application['meta-data'] ?? []) as Array<{ $: Record<string, string> }>;
    const idx = metaData.findIndex(
      (m) => m.$?.['android:name'] === MANIFEST_META.PICO_APP_ID
    );
    // Reference a string resource (written by withPicoStrings from env)
    // instead of inlining — the ID is per-environment and shouldn't be
    // baked into the manifest at config time.
    const entry = {
      $: {
        'android:name': MANIFEST_META.PICO_APP_ID,
        'android:value': '@string/pico_app_id',
      },
    };
    if (idx === -1) metaData.push(entry);
    else metaData[idx] = entry;
    application['meta-data'] = metaData as never;
    return config;
  });
};

function detectExpoDevClient(projectRoot: string): boolean {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    return Boolean(pkg.dependencies?.['expo-dev-client'] || pkg.devDependencies?.['expo-dev-client']);
  } catch {
    return false;
  }
}

export const withPicoAndroidManifest: ConfigPlugin<ResolvedPicoOptions> = (config, options) => {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const picoManifestDir = path.join(projectRoot, 'android', 'app', 'src', 'pico');
      const picoManifestPath = path.join(picoManifestDir, 'AndroidManifest.xml');

      if (!fs.existsSync(picoManifestDir)) {
        fs.mkdirSync(picoManifestDir, { recursive: true });
      }

      // ponytail: detect expo-dev-client so we skip the IMMERSIVE_HMD launcher
      // intent-filter on MainActivity — its 2D RN/dev-launcher root can't
      // fulfill the immersive HMD surface and PICO black-screens. Keep
      // pvr.app.type/spatialMode honored so MR builds still get the
      // passthrough capability at app level; only the launcher contract
      // changes. Viro's VRActivity owns immersive entry either way.
      const hasDevClient = detectExpoDevClient(projectRoot);
      const manifest = buildPicoManifest(options);
      // Phase A launcher contract: pvr.app.type meta + immersive launcher
      // categories on .MainActivity + <queries> for PICO system packages.
      // Mutates the manifest object in place; gated on resolved appType.
      applyLauncherContract(manifest, options, { hasDevClient });
      // Phase B Platform SDK contract: UnityAuthInterface + PicoSDKBrowser
      // activities. Gated on platformService.hasIdentity && declareActivities.
      applyPlatformServiceContract(manifest, options);
      // Phase C hardware capabilities: eye/face/body tracking features +
      // permissions, spatial-audio + foveation features, refresh-rate
      // meta-data. Each capability is independently gated; all writes
      // are idempotent and toggling off cleans up the entry.
      applyCapabilityContract(manifest, options);
      await AndroidConfig.Manifest.writeAndroidManifestAsync(picoManifestPath, manifest);
      console.log(`✅ Created PICO-specific AndroidManifest at: ${picoManifestPath}`);

      // If dual variant, also write a dual/ source set manifest
      if (options.buildVariant === 'dual') {
        const dualDir = path.join(projectRoot, 'android', 'app', 'src', 'dual');
        if (!fs.existsSync(dualDir)) fs.mkdirSync(dualDir, { recursive: true });
        const dualManifestPath = path.join(dualDir, 'AndroidManifest.xml');
        await AndroidConfig.Manifest.writeAndroidManifestAsync(dualManifestPath, manifest);
        console.log(`✅ Created dual-variant AndroidManifest at: ${dualManifestPath}`);
      }

      return config;
    },
  ]);

  return config;
};

function buildPicoManifest(options: ResolvedPicoOptions): AndroidConfig.Manifest.AndroidManifest {
  const effectiveProfile = resolveTargetProfile(options);

  const manifest: AndroidConfig.Manifest.AndroidManifest = {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        'xmlns:tools': 'http://schemas.android.com/tools',
      },
      queries: [],
      'uses-permission': [],
      'uses-feature': [],
      application: [],
    },
  };

  for (const permission of PICO_PROHIBITED_PERMISSIONS) {
    const fullName = permission.includes('.')
      ? permission
      : `android.permission.${permission}`;
    manifest.manifest['uses-permission']!.push({
      $: { 'android:name': fullName, 'tools:node': 'remove' },
    } as any);
  }
  console.log(
    `🚫 Blocked ${PICO_PROHIBITED_PERMISSIONS.length} prohibited permissions in PICO manifest`
  );

  // VR headtracking — required false when emulator optimizations on
  const headtrackingRequired = options.enableEmulatorOptimizations ? 'false' : 'true';
  manifest.manifest['uses-feature']!.push({
    $: {
      'android:name': PICO_FEATURES.VR_HEADTRACKING,
      'android:required': headtrackingRequired,
      'android:version': '1',
    },
  } as any);

  if (options.handTracking) {
    manifest.manifest['uses-feature']!.push({
      $: { 'android:name': PICO_FEATURES.HAND_TRACKING, 'android:required': 'false' },
    } as any);
  }

  if (options.passthrough) {
    manifest.manifest['uses-feature']!.push({
      $: { 'android:name': PICO_FEATURES.PASSTHROUGH, 'android:required': 'false' },
    } as any);
  }

  if (options.sceneUnderstanding) {
    manifest.manifest['uses-feature']!.push({
      $: { 'android:name': PICO_FEATURES.SCENE_UNDERSTANDING, 'android:required': 'false' },
    } as any);
  }

  // Swan target gets spatial anchor feature declaration
  if (effectiveProfile === 'swan') {
    manifest.manifest['uses-feature']!.push({
      $: { 'android:name': PICO_FEATURES.SPATIAL_ANCHOR, 'android:required': 'false' },
    } as any);
  }

  const application: any = {
    $: {
      'android:allowBackup': 'false',
      'tools:replace': 'android:allowBackup',
    },
    'meta-data': [],
    activity: [],
  };

  // pvr.app.id is written to the MAIN manifest by
  // withPicoPlatformServiceMainManifest so every flavor (pico, quest,
  // mobile, dual) gets it. Don't duplicate here — would create a
  // tools:replace conflict during manifest merging.

  if (options.targetDevices.length > 0) {
    const deviceValues = options.targetDevices.map((d) => DEVICE_TARGET_MAP[d] ?? d).join('|');
    application['meta-data'].push({
      $: { 'android:name': MANIFEST_META.SUPPORTED_DEVICES, 'android:value': deviceValues },
    });
  }

  if (options.spatialMode !== '2d') {
    application['meta-data'].push({
      $: { 'android:name': MANIFEST_META.SPATIAL_MODE, 'android:value': options.spatialMode },
    });
  }

  if (options.defaultContainerMode !== 'none') {
    application['meta-data'].push({
      $: { 'android:name': MANIFEST_META.CONTAINER_MODE, 'android:value': options.defaultContainerMode },
    });
  }

  // Always write target profile (resolved)
  application['meta-data'].push({
    $: { 'android:name': MANIFEST_META.TARGET_PROFILE, 'android:value': TARGET_PROFILE_MAP[effectiveProfile] ?? effectiveProfile },
  });

  // Always write xrMode so PICO OS launchers / entitlement checks can read it
  // without instantiating the app. Mirrors BuildConfig.PICO_XR_MODE.
  application['meta-data'].push({
    $: {
      'android:name': MANIFEST_META.XR_MODE,
      'android:value': XR_MODE_MANIFEST_VALUE[options.xrMode] ?? options.xrMode,
    },
  });

  if (options.xrMode === 'pico-swan') {
    if (options.picoSwan.declareSpatialContainerCategory) {
      application['meta-data'].push({
        $: {
          'android:name': MANIFEST_META.SWAN_SPATIAL_CONTAINER,
          'android:value': options.defaultContainerMode === 'none'
            ? 'window-container'
            : options.defaultContainerMode,
        },
      });
    }
    if (options.picoSwan.swanSdkArtifact) {
      // Encode the artifact version into the manifest as a debug aid
      // (PICO support tooling typically inspects manifest meta to know
      // which Swan runtime an APK was built against).
      const versionFragment = options.picoSwan.swanSdkArtifact.split(':').pop() ?? '';
      if (versionFragment) {
        application['meta-data'].push({
          $: {
            'android:name': MANIFEST_META.SWAN_RUNTIME_VERSION,
            'android:value': versionFragment,
          },
        });
      }
    }
  }

  if (options.entitlementCheck) {
    application['meta-data'].push({
      $: { 'android:name': MANIFEST_META.ENTITLEMENT_CHECK, 'android:value': 'true' },
    });
  }

  if (options.developerTools) {
    application['meta-data'].push({
      $: { 'android:name': MANIFEST_META.DEVELOPER_TOOLS, 'android:value': 'true' },
    });
  }

  manifest.manifest.application!.push(application);
  return manifest;
}

export default withPicoAndroidManifest;
