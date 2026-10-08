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
exports.withQuestStoreDeviceTargets = exports.STORE_DEVICE_TARGET_SPECIFIERS = exports.OCULUS_SUPPORTED_DEVICES_META = exports.STORE_DEVICE_TARGETS_META = void 0;
exports.normalizeStoreDeviceTargets = normalizeStoreDeviceTargets;
exports.deriveStoreDeviceTargets = deriveStoreDeviceTargets;
exports.readSupportedDevices = readSupportedDevices;
exports.applyStoreDeviceTargets = applyStoreDeviceTargets;
exports.syncQuestStoreDeviceTargets = syncQuestStoreDeviceTargets;
const config_plugins_1 = require("@expo/config-plugins");
// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/** Meta-data that seeds a build's Device Targeting in the Meta Developer Dashboard. */
exports.STORE_DEVICE_TARGETS_META = 'com.meta.store.defaultDeviceTargets';
/** Meta-data expo-horizon-core and react-viro write with the headset allow-list. */
exports.OCULUS_SUPPORTED_DEVICES_META = 'com.oculus.supportedDevices';
/**
 * Specifiers Meta documents for `com.meta.store.defaultDeviceTargets`
 * (publish-release-channels-device-targeting). Joined with `|`.
 */
exports.STORE_DEVICE_TARGET_SPECIFIERS = [
    'quest2only',
    'questproonly',
    'quest3only',
    'quest2+',
    'questpro+',
    'quest3+',
    'questpro-',
];
/**
 * Validates and normalizes a `storeDeviceTargets` value. Returns the trimmed,
 * `|`-joined specifier string, `false` for an explicit opt-out (`false` or an
 * empty string), or `null` when unset (derive from supportedDevices).
 * Throws on any specifier outside the documented set.
 */
function normalizeStoreDeviceTargets(value) {
    if (value === undefined || value === null)
        return null;
    if (value === false)
        return false;
    if (typeof value !== 'string') {
        throw new Error(`[expo-pico-core] storeDeviceTargets must be a string or false, got ${typeof value}.`);
    }
    if (value.trim() === '')
        return false;
    const parts = value.split('|').map((p) => p.trim());
    const allowed = exports.STORE_DEVICE_TARGET_SPECIFIERS;
    const unknown = parts.filter((p) => !allowed.includes(p));
    if (unknown.length > 0) {
        throw new Error(`[expo-pico-core] storeDeviceTargets has unknown specifier(s): ${unknown
            .map((p) => JSON.stringify(p))
            .join(', ')}. Use one or more of ${exports.STORE_DEVICE_TARGET_SPECIFIERS.join(', ')}, ` +
            `joined with "|".`);
    }
    return [...new Set(parts)].join('|');
}
/**
 * Picks a default from the quest manifest's `com.oculus.supportedDevices`:
 * the `+` specifier for the oldest listed device family, so the Store build
 * also reaches newer devices in that line (Meta: "`quest3+` includes Quest 3
 * family, Meta VR Glasses, and future devices"). `vrglasses` alone maps to
 * `quest3+` for the same reason. Returns null when the list names no Quest 2,
 * Pro, 3-family or Meta VR Glasses device.
 */
function deriveStoreDeviceTargets(supportedDevices) {
    if (!supportedDevices)
        return null;
    const devices = new Set(supportedDevices
        .split('|')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean));
    if (devices.has('quest2'))
        return 'quest2+';
    if (devices.has('questpro'))
        return 'questpro+';
    if (devices.has('quest3') || devices.has('quest3s') || devices.has('vrglasses'))
        return 'quest3+';
    return null;
}
function applicationOf(manifest) {
    return manifest.manifest.application?.[0];
}
/** Reads `com.oculus.supportedDevices` from a parsed quest manifest. */
function readSupportedDevices(manifest) {
    const entry = applicationOf(manifest)?.['meta-data']?.find((m) => m.$?.['android:name'] === exports.OCULUS_SUPPORTED_DEVICES_META);
    return entry?.$?.['android:value'] ?? null;
}
/**
 * Sets (string) or removes (null) the store device-targets meta-data in the
 * manifest's `<application>`. Every other entry is left alone. Returns true
 * when the manifest changed.
 */
function applyStoreDeviceTargets(manifest, value) {
    const before = JSON.stringify(manifest);
    // expo-horizon-core owns the quest <application>; never invent one.
    const app = applicationOf(manifest);
    if (!app)
        return false;
    const kept = (app['meta-data'] ?? []).filter((m) => m.$?.['android:name'] !== exports.STORE_DEVICE_TARGETS_META);
    if (value !== null) {
        kept.push({ $: { 'android:name': exports.STORE_DEVICE_TARGETS_META, 'android:value': value } });
    }
    if (kept.length > 0)
        app['meta-data'] = kept;
    else
        delete app['meta-data'];
    return JSON.stringify(manifest) !== before;
}
/**
 * Brings `app/src/quest/AndroidManifest.xml` in line with
 * `storeDeviceTargets`. The quest manifest belongs to expo-horizon-core, so
 * this never creates one: no quest flavor, nothing to target.
 */
async function syncQuestStoreDeviceTargets(platformRoot, options) {
    const questPath = path.join(platformRoot, 'app', 'src', 'quest', 'AndroidManifest.xml');
    if (!fs.existsSync(questPath))
        return;
    const manifest = await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(questPath);
    const setting = options.storeDeviceTargets;
    let value;
    if (setting === false)
        value = null;
    else if (setting !== null)
        value = setting;
    else {
        const supported = readSupportedDevices(manifest);
        value = deriveStoreDeviceTargets(supported);
        if (value === null && supported) {
            console.warn(`[expo-pico-core] No Meta Store device targets derived from com.oculus.supportedDevices="${supported}"; ` +
                'set storeDeviceTargets to write com.meta.store.defaultDeviceTargets.');
        }
    }
    if (!applyStoreDeviceTargets(manifest, value))
        return;
    await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(questPath, manifest);
}
/**
 * Writes `com.meta.store.defaultDeviceTargets` into the quest flavor
 * manifest. Meta uses it to initialize the build's Device Targeting in the
 * Developer Dashboard; an `ovr-platform-util --channel "alpha:quest3+"`
 * suffix overrides it per upload. pico, dual, mobile and main never get it.
 *
 * Runs as a finalized mod for the same reason as withQuestRenderModel:
 * expo-horizon-core rewrites the quest manifest in a dangerous mod.
 */
const withQuestStoreDeviceTargets = (config, options) => withFinalizedMod(config, [
    'android',
    async (cfg) => {
        await syncQuestStoreDeviceTargets(cfg.modRequest.platformProjectRoot, options);
        return cfg;
    },
]);
exports.withQuestStoreDeviceTargets = withQuestStoreDeviceTargets;
//# sourceMappingURL=withQuestStoreDeviceTargets.js.map