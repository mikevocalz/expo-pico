"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPicoAndroidManifest = exports.withPicoPlatformServiceMainManifest = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const constants_1 = require("./constants");
const types_1 = require("./types");
const withPicoCapabilities_1 = require("./withPicoCapabilities");
const withPicoLauncherActivity_1 = require("./withPicoLauncherActivity");
const withPicoVRActivity_1 = require("./withPicoVRActivity");
const withPicoPlatformService_1 = require("./withPicoPlatformService");
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
const withPicoPlatformServiceMainManifest = (config, options) => {
    if (!options.picoAppId)
        return config;
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const application = config_plugins_1.AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
        const metaData = (application['meta-data'] ?? []);
        const idx = metaData.findIndex((m) => m.$?.['android:name'] === constants_1.MANIFEST_META.PICO_APP_ID);
        // Reference a string resource (written by withPicoStrings from env)
        // instead of inlining — the ID is per-environment and shouldn't be
        // baked into the manifest at config time.
        const entry = {
            $: {
                'android:name': constants_1.MANIFEST_META.PICO_APP_ID,
                'android:value': '@string/pico_app_id',
            },
        };
        if (idx === -1)
            metaData.push(entry);
        else
            metaData[idx] = entry;
        application['meta-data'] = metaData;
        return config;
    });
};
exports.withPicoPlatformServiceMainManifest = withPicoPlatformServiceMainManifest;
function detectExpoDevClient(projectRoot) {
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
        return Boolean(pkg.dependencies?.['expo-dev-client'] || pkg.devDependencies?.['expo-dev-client']);
    }
    catch {
        return false;
    }
}
const withPicoAndroidManifest = (config, options) => {
    config = (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (config) => {
            const projectRoot = config.modRequest.projectRoot;
            const picoManifestDir = path.join(projectRoot, 'android', 'app', 'src', 'pico');
            const picoManifestPath = path.join(picoManifestDir, 'AndroidManifest.xml');
            if (!fs.existsSync(picoManifestDir)) {
                fs.mkdirSync(picoManifestDir, { recursive: true });
            }
            // Detect expo-dev-client so we skip the IMMERSIVE_HMD launcher
            // intent-filter on MainActivity — its 2D RN/dev-launcher root can't
            // fulfill the immersive HMD surface and PICO black-screens. Keep
            // pvr.app.type/spatialMode honored so MR builds still get the
            // passthrough capability at app level; only the launcher contract
            // changes. Viro's VRActivity owns immersive entry either way.
            const hasDevClient = detectExpoDevClient(projectRoot);
            const manifest = buildPicoManifest(options);
            // Launcher contract: pvr.app.type meta + immersive launcher
            // categories on .MainActivity + <queries> for PICO system packages.
            // Mutates the manifest object in place; gated on resolved appType.
            (0, withPicoLauncherActivity_1.applyLauncherContract)(manifest, options, { hasDevClient });
            // VRActivity contract: adds PICO intent-filter categories + spatial
            // immersive meta-data to the .VRActivity generated by the
            // @reactvision/react-viro plugin. Required so PICO routes the
            // immersive HMD surface to VRActivity (not MainActivity, which stays
            // a 2D panel / window-container).
            (0, withPicoVRActivity_1.applyVRActivityContract)(manifest, options);
            // Panel size contract: emits <layout android:defaultWidth/Height>
            // on .MainActivity when the user specified the Horizon-parity panel
            // dimensions. No-op when both options are unset.
            (0, withPicoVRActivity_1.applyPanelSize)(manifest, options);
            // Platform SDK contract: UnityAuthInterface + PicoSDKBrowser
            // activities. Gated on platformService.hasIdentity && declareActivities.
            (0, withPicoPlatformService_1.applyPlatformServiceContract)(manifest, options);
            // Hardware capabilities: eye/face/body tracking features +
            // permissions, spatial-audio + foveation features, refresh-rate
            // meta-data. Each capability is independently gated; all writes
            // are idempotent and toggling off cleans up the entry.
            (0, withPicoCapabilities_1.applyCapabilityContract)(manifest, options);
            await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(picoManifestPath, manifest);
            console.log(`✅ Created PICO-specific AndroidManifest at: ${picoManifestPath}`);
            // If dual variant, also write a dual/ source set manifest
            if (options.buildVariant === 'dual') {
                const dualDir = path.join(projectRoot, 'android', 'app', 'src', 'dual');
                if (!fs.existsSync(dualDir))
                    fs.mkdirSync(dualDir, { recursive: true });
                const dualManifestPath = path.join(dualDir, 'AndroidManifest.xml');
                await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(dualManifestPath, manifest);
                console.log(`✅ Created dual-variant AndroidManifest at: ${dualManifestPath}`);
            }
            return config;
        },
    ]);
    return config;
};
exports.withPicoAndroidManifest = withPicoAndroidManifest;
function buildPicoManifest(options) {
    const effectiveProfile = (0, types_1.resolveTargetProfile)(options);
    const manifest = {
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
    for (const permission of constants_1.PICO_PROHIBITED_PERMISSIONS) {
        const fullName = permission.includes('.') ? permission : `android.permission.${permission}`;
        manifest.manifest['uses-permission'].push({
            $: { 'android:name': fullName, 'tools:node': 'remove' },
        });
    }
    console.log(`🚫 Blocked ${constants_1.PICO_PROHIBITED_PERMISSIONS.length} prohibited permissions in PICO manifest`);
    // VR headtracking — required false when emulator optimizations on
    const headtrackingRequired = options.enableEmulatorOptimizations ? 'false' : 'true';
    manifest.manifest['uses-feature'].push({
        $: {
            'android:name': constants_1.PICO_FEATURES.VR_HEADTRACKING,
            'android:required': headtrackingRequired,
            'android:version': '1',
        },
    });
    if (options.handTracking) {
        manifest.manifest['uses-feature'].push({
            $: { 'android:name': constants_1.PICO_FEATURES.HAND_TRACKING, 'android:required': 'false' },
        });
    }
    if (options.passthrough) {
        manifest.manifest['uses-feature'].push({
            $: { 'android:name': constants_1.PICO_FEATURES.PASSTHROUGH, 'android:required': 'false' },
        });
    }
    if (options.sceneUnderstanding) {
        manifest.manifest['uses-feature'].push({
            $: { 'android:name': constants_1.PICO_FEATURES.SCENE_UNDERSTANDING, 'android:required': 'false' },
        });
    }
    // Swan target gets spatial anchor feature declaration
    if (effectiveProfile === 'swan') {
        manifest.manifest['uses-feature'].push({
            $: { 'android:name': constants_1.PICO_FEATURES.SPATIAL_ANCHOR, 'android:required': 'false' },
        });
    }
    const application = {
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
        const deviceValues = options.targetDevices.map((d) => constants_1.DEVICE_TARGET_MAP[d] ?? d).join('|');
        application['meta-data'].push({
            $: { 'android:name': constants_1.MANIFEST_META.SUPPORTED_DEVICES, 'android:value': deviceValues },
        });
    }
    if (options.spatialMode !== '2d') {
        application['meta-data'].push({
            $: { 'android:name': constants_1.MANIFEST_META.SPATIAL_MODE, 'android:value': options.spatialMode },
        });
    }
    if (options.defaultContainerMode !== 'none') {
        application['meta-data'].push({
            $: {
                'android:name': constants_1.MANIFEST_META.CONTAINER_MODE,
                'android:value': options.defaultContainerMode,
            },
        });
    }
    // Always write target profile (resolved)
    application['meta-data'].push({
        $: {
            'android:name': constants_1.MANIFEST_META.TARGET_PROFILE,
            'android:value': constants_1.TARGET_PROFILE_MAP[effectiveProfile] ?? effectiveProfile,
        },
    });
    // Always write xrMode so PICO OS launchers / entitlement checks can read it
    // without instantiating the app. Mirrors BuildConfig.PICO_XR_MODE.
    application['meta-data'].push({
        $: {
            'android:name': constants_1.MANIFEST_META.XR_MODE,
            'android:value': constants_1.XR_MODE_MANIFEST_VALUE[options.xrMode] ?? options.xrMode,
        },
    });
    if (options.xrMode === 'pico-swan') {
        if (options.picoSwan.declareSpatialContainerCategory) {
            application['meta-data'].push({
                $: {
                    'android:name': constants_1.MANIFEST_META.SWAN_SPATIAL_CONTAINER,
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
                        'android:name': constants_1.MANIFEST_META.SWAN_RUNTIME_VERSION,
                        'android:value': versionFragment,
                    },
                });
            }
        }
    }
    if (options.entitlementCheck) {
        application['meta-data'].push({
            $: { 'android:name': constants_1.MANIFEST_META.ENTITLEMENT_CHECK, 'android:value': 'true' },
        });
    }
    if (options.developerTools) {
        application['meta-data'].push({
            $: { 'android:name': constants_1.MANIFEST_META.DEVELOPER_TOOLS, 'android:value': 'true' },
        });
    }
    manifest.manifest.application.push(application);
    return manifest;
}
exports.default = exports.withPicoAndroidManifest;
//# sourceMappingURL=withPicoAndroidManifest.js.map