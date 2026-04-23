import {
  ConfigPlugin,
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

      const manifest = buildPicoManifest(options);
      await AndroidConfig.Manifest.writeAndroidManifestAsync(picoManifestPath, manifest);

      // If dual variant, also write a dual/ source set manifest
      if (options.buildVariant === 'dual') {
        const dualDir = path.join(projectRoot, 'android', 'app', 'src', 'dual');
        if (!fs.existsSync(dualDir)) fs.mkdirSync(dualDir, { recursive: true });
        await AndroidConfig.Manifest.writeAndroidManifestAsync(
          path.join(dualDir, 'AndroidManifest.xml'),
          manifest
        );
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

  if (options.picoAppId) {
    application['meta-data'].push({
      $: { 'android:name': MANIFEST_META.PICO_APP_ID, 'android:value': options.picoAppId },
    });
  }

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
