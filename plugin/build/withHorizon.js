"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withCustomAndroidManifest_1 = __importDefault(require("./withCustomAndroidManifest"));
const withProhibitedPermissions_1 = require("./withProhibitedPermissions");
const USE_EXPERIMENTAL_PLUGIN = true;
const withHorizon = (config, options) => {
    if (options === null ||
        typeof options !== 'object' ||
        Array.isArray(options) ||
        typeof options.supportedDevices !== 'string' ||
        !/^[A-Za-z0-9_-]+(?:\|[A-Za-z0-9_-]+)*$/.test(options.supportedDevices)) {
        throw new Error('[expo-horizon-core] supportedDevices is required and must be a non-empty pipe-separated string of device names (letters, digits, underscores, or hyphens), e.g. "quest2|quest3|quest3s".');
    }
    validateHorizonSdkVersions(options);
    validatePanelMinimums(options);
    config = withHorizonAppId(config, options);
    if (USE_EXPERIMENTAL_PLUGIN) {
        config = (0, withCustomAndroidManifest_1.default)(config, options);
    }
    else if (process.env.EXPO_HORIZON) {
        // This is the old approach, we should remove it in the future
        // TODO: Remove this
        config = withHorizonEnabled(config);
        config = withPanelSize(config, options);
        config = withSupportedDevices(config, options);
        config = withVrHeadtracking(config, options);
        config = (0, withProhibitedPermissions_1.withProhibitedPermissions)(config);
    }
    return config;
};
function validatePanelMinimums(options) {
    for (const key of ['minWidth', 'minHeight']) {
        const value = options[key];
        if (value !== undefined &&
            (typeof value !== 'string' ||
                !/^\d+(?:\.\d+)?dp$/.test(value) ||
                !Number.isFinite(parseFloat(value)) ||
                parseFloat(value) <= 0)) {
            throw new Error(`[expo-horizon-core] ${key} must be a positive dp dimension, e.g. "360dp".`);
        }
    }
}
function validateHorizonSdkVersions(options) {
    for (const key of ['horizonMinSdkVersion', 'horizonTargetSdkVersion']) {
        const version = options[key];
        if (version !== undefined &&
            (!Number.isInteger(version) || version < 61 || version > 2147483647)) {
            throw new Error(`[expo-horizon-core] ${key} must be an integer between 61 and 2147483647.`);
        }
    }
    if (options.horizonMinSdkVersion !== undefined &&
        options.horizonTargetSdkVersion !== undefined &&
        options.horizonTargetSdkVersion < options.horizonMinSdkVersion) {
        throw new Error('[expo-horizon-core] horizonTargetSdkVersion must be greater than or equal to horizonMinSdkVersion.');
    }
}
const withHorizonEnabled = (config) => {
    return (0, config_plugins_1.withGradleProperties)(config, (config) => {
        config.modResults.push({
            type: 'property',
            key: 'horizonEnabled',
            value: 'true',
        });
        return config;
    });
};
const withHorizonAppId = (config, options) => {
    return (0, config_plugins_1.withGradleProperties)(config, (config) => {
        const horizonAppId = options.horizonAppId ?? '';
        config.modResults = config.modResults.filter((item) => item.type !== 'property' || item.key !== 'horizonAppId');
        config.modResults.push({
            type: 'property',
            key: 'horizonAppId',
            value: horizonAppId,
        });
        return config;
    });
};
const withPanelSize = (config, options) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        // Only add layout if at least one dimension is provided
        if (!options.defaultHeight &&
            !options.defaultWidth &&
            !options.minWidth &&
            !options.minHeight) {
            return config;
        }
        const mainActivity = config.modResults.manifest?.application?.[0]?.activity?.find((activity) => activity.$?.['android:name'] === '.MainActivity');
        if (mainActivity) {
            if (!mainActivity.layout) {
                mainActivity.layout = [];
            }
            const layoutAttrs = {};
            if (options.defaultHeight) {
                layoutAttrs['android:defaultHeight'] = options.defaultHeight;
            }
            if (options.defaultWidth) {
                layoutAttrs['android:defaultWidth'] = options.defaultWidth;
            }
            if (options.minWidth) {
                layoutAttrs['android:minWidth'] = options.minWidth;
            }
            if (options.minHeight) {
                layoutAttrs['android:minHeight'] = options.minHeight;
            }
            mainActivity.layout.push({
                $: layoutAttrs,
            });
        }
        return config;
    });
};
const withSupportedDevices = (config, options) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        // Only add meta-data if supportedDevices is explicitly provided
        if (!options.supportedDevices) {
            return config;
        }
        const application = config.modResults.manifest?.application?.[0];
        if (application) {
            if (!application['meta-data']) {
                application['meta-data'] = [];
            }
            application['meta-data'].push({
                $: {
                    'android:name': 'com.oculus.supportedDevices',
                    'android:value': options.supportedDevices,
                },
            });
        }
        return config;
    });
};
const withVrHeadtracking = (config, options) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        // Add VR headtracking by default unless explicitly disabled
        if (options.disableVrHeadtracking === true) {
            return config;
        }
        const manifest = config.modResults.manifest;
        if (manifest) {
            if (!manifest['uses-feature']) {
                manifest['uses-feature'] = [];
            }
            manifest['uses-feature'].push({
                $: {
                    'android:name': 'android.hardware.vr.headtracking',
                    'android:required': 'true',
                    'android:version': '1',
                },
            });
        }
        return config;
    });
};
exports.default = withHorizon;
