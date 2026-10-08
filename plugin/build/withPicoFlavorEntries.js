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
exports.withPicoMobileFlavorManifest = exports.withPicoFlavorMetaData = exports.withPicoFlavorFeature = exports.withPicoFlavorPermission = void 0;
exports.getPicoFlavorManifestState = getPicoFlavorManifestState;
exports.markPicoFlavorPresent = markPicoFlavorPresent;
exports.resolvePicoManifestRoute = resolvePicoManifestRoute;
exports.hasQuestFlavor = hasQuestFlavor;
exports.applyPicoFlavorEntries = applyPicoFlavorEntries;
exports.applyMobileFlavorEntries = applyMobileFlavorEntries;
const config_plugins_1 = require("@expo/config-plugins");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Key under `config._internal` where PICO-only manifest requests are recorded.
 */
const STATE_KEY = 'expoPicoFlavorManifest';
/** Plugins known to add a `quest` product flavor on their own. */
const QUEST_FLAVOR_PLUGINS = ['expo-horizon-core'];
/**
 * Shared state for PICO-only manifest entries. Plugins record their entries
 * here when the config is evaluated; mods read it later, after every plugin
 * has run, so plugin order does not matter.
 */
function getPicoFlavorManifestState(config) {
    config._internal ?? (config._internal = {});
    const existing = config._internal[STATE_KEY];
    // Fill missing fields so state written by an older copy of this module
    // (for example a second installed core) cannot crash a lookup.
    const state = {
        hasPicoFlavor: existing?.hasPicoFlavor ?? false,
        hasQuestFlavor: existing?.hasQuestFlavor ?? false,
        permissions: existing?.permissions ?? [],
        features: existing?.features ?? [],
        metaData: existing?.metaData ?? [],
        mobileWriterRegistered: existing?.mobileWriterRegistered ?? false,
    };
    if (existing)
        Object.assign(existing, state);
    const result = (existing ?? state);
    config._internal[STATE_KEY] = result;
    return result;
}
/** Called by `withPico` when it writes a pico (and dual) flavor manifest. */
function markPicoFlavorPresent(config) {
    getPicoFlavorManifestState(config).hasPicoFlavor = true;
}
function resolvePicoManifestRoute(config) {
    const state = getPicoFlavorManifestState(config);
    if (state.hasPicoFlavor)
        return 'pico-flavor';
    if (hasQuestFlavor(config))
        return 'mobile-flavor';
    return 'main';
}
/** True when the app has a `quest` product flavor (see {@link PicoFlavorManifestState.hasQuestFlavor}). */
function hasQuestFlavor(config) {
    return getPicoFlavorManifestState(config).hasQuestFlavor || listsQuestFlavorPlugin(config);
}
function listsQuestFlavorPlugin(config) {
    return (config.plugins ?? []).some((entry) => {
        const name = Array.isArray(entry) ? entry[0] : entry;
        return typeof name === 'string' && QUEST_FLAVOR_PLUGINS.includes(name);
    });
}
/**
 * Declares a PICO-only `<uses-permission>`, routed per
 * {@link PicoManifestRoute}. The quest flavor never gets it.
 */
const withPicoFlavorPermission = (config, name) => {
    const state = getPicoFlavorManifestState(config);
    if (!state.permissions.includes(name))
        state.permissions.push(name);
    config = (0, exports.withPicoMobileFlavorManifest)(config);
    return (0, config_plugins_1.withAndroidManifest)(config, (cfg) => {
        const root = cfg.modResults.manifest;
        if (resolvePicoManifestRoute(cfg) !== 'main') {
            if (root['uses-permission']) {
                root['uses-permission'] = removeByName(root['uses-permission'], name);
            }
            return cfg;
        }
        upsertPermission((root['uses-permission'] ?? (root['uses-permission'] = [])), name);
        return cfg;
    });
};
exports.withPicoFlavorPermission = withPicoFlavorPermission;
/**
 * Declares a PICO-only `<uses-feature>`, routed like
 * {@link withPicoFlavorPermission}. When several plugins declare the same
 * feature, it is required if any of them asks for `required: true`, so the
 * result does not depend on plugin order.
 */
const withPicoFlavorFeature = (config, { name, required = false }) => {
    const state = getPicoFlavorManifestState(config);
    const recorded = state.features.find((f) => f.name === name);
    if (recorded)
        recorded.required || (recorded.required = required);
    else
        state.features.push({ name, required });
    config = (0, exports.withPicoMobileFlavorManifest)(config);
    return (0, config_plugins_1.withAndroidManifest)(config, (cfg) => {
        const root = cfg.modResults.manifest;
        if (resolvePicoManifestRoute(cfg) !== 'main') {
            if (root['uses-feature'])
                root['uses-feature'] = removeByName(root['uses-feature'], name);
            return cfg;
        }
        const current = getPicoFlavorManifestState(cfg).features.find((f) => f.name === name);
        upsertFeature((root['uses-feature'] ?? (root['uses-feature'] = [])), name, current?.required ?? required);
        return cfg;
    });
};
exports.withPicoFlavorFeature = withPicoFlavorFeature;
/**
 * Declares PICO-only `<application>` meta-data, routed like
 * {@link withPicoFlavorPermission}; on the `pico-flavor` route `mobileFlavor`
 * adds the mobile flavor manifest. A later declaration of the same name
 * replaces the value on the `main` and `mobile-flavor` routes. In the pico
 * flavor manifest, an entry core already wrote (such as `pvr.app.type` from
 * `appType`) is kept.
 */
const withPicoFlavorMetaData = (config, { name, value, mobileFlavor = false }) => {
    const state = getPicoFlavorManifestState(config);
    const recorded = state.metaData.find((m) => m.name === name);
    if (recorded) {
        recorded.value = value;
        recorded.mobileFlavor || (recorded.mobileFlavor = mobileFlavor);
    }
    else {
        state.metaData.push({ name, value, mobileFlavor });
    }
    config = (0, exports.withPicoMobileFlavorManifest)(config);
    return (0, config_plugins_1.withAndroidManifest)(config, (cfg) => {
        const application = cfg.modResults.manifest.application?.[0];
        if (!application)
            return cfg;
        if (resolvePicoManifestRoute(cfg) !== 'main') {
            if (application['meta-data']) {
                application['meta-data'] = removeByName(application['meta-data'], name);
            }
            return cfg;
        }
        const entry = getPicoFlavorManifestState(cfg).metaData.find((m) => m.name === name);
        upsertMetaData((application['meta-data'] ?? (application['meta-data'] = [])), name, entry?.value ?? value);
        return cfg;
    });
};
exports.withPicoFlavorMetaData = withPicoFlavorMetaData;
/**
 * Writes the recorded entries into the pico flavor manifest. Entries already
 * present (for example a feature core emits itself) are left as they are.
 */
function applyPicoFlavorEntries(manifest, state) {
    var _a;
    const root = manifest.manifest;
    const permissions = (root['uses-permission'] ?? (root['uses-permission'] = []));
    for (const name of state.permissions) {
        if (!hasName(permissions, name))
            permissions.push({ $: { 'android:name': name } });
    }
    const features = (root['uses-feature'] ?? (root['uses-feature'] = []));
    for (const { name, required } of state.features) {
        if (!hasName(features, name))
            upsertFeature(features, name, required);
    }
    const metaData = ((_a = ensureApplication(manifest))['meta-data'] ?? (_a['meta-data'] = []));
    for (const { name, value } of state.metaData) {
        if (!hasName(metaData, name))
            upsertMetaData(metaData, name, value);
    }
    return manifest;
}
/**
 * Brings the mobile flavor manifest in line with the route: upserts the
 * entries it should carry and removes any other PICO entry (`com.picovr.*` /
 * `com.pico.*` permissions, `pico.*` features, `pvr.*` / `com.pico.*`
 * meta-data), so a value left by an older prebuild does not survive.
 * Returns true when the manifest changed.
 */
function applyMobileFlavorEntries(manifest, state, route) {
    var _a;
    const before = JSON.stringify(manifest);
    const everything = route === 'mobile-flavor';
    const permissions = everything ? state.permissions : [];
    const features = everything ? state.features : [];
    const metaData = route === 'main'
        ? []
        : everything
            ? state.metaData
            : state.metaData.filter((m) => m.mobileFlavor);
    const root = manifest.manifest;
    if (root['uses-permission']) {
        root['uses-permission'] = root['uses-permission'].filter((p) => !isPicoPermission(p.$['android:name']) || permissions.includes(p.$['android:name']));
    }
    if (root['uses-feature']) {
        root['uses-feature'] = root['uses-feature'].filter((f) => !isPicoFeature(f.$['android:name']) || features.some((x) => x.name === f.$['android:name']));
    }
    const application = root.application?.[0];
    if (application?.['meta-data']) {
        application['meta-data'] = application['meta-data'].filter((m) => !isPicoMetaData(m.$['android:name']) || metaData.some((x) => x.name === m.$['android:name']));
    }
    if (permissions.length > 0) {
        const list = (root['uses-permission'] ?? (root['uses-permission'] = []));
        for (const name of permissions)
            upsertPermission(list, name);
    }
    if (features.length > 0) {
        const list = (root['uses-feature'] ?? (root['uses-feature'] = []));
        for (const { name, required } of features)
            upsertFeature(list, name, required);
    }
    if (metaData.length > 0) {
        const list = ((_a = ensureApplication(manifest))['meta-data'] ?? (_a['meta-data'] = []));
        for (const { name, value } of metaData)
            upsertMetaData(list, name, value);
    }
    return JSON.stringify(manifest) !== before;
}
/**
 * Registers, once per config, the mod that maintains
 * `android/app/src/mobile/AndroidManifest.xml`. It creates the file only when
 * there is something to write, and otherwise only edits an existing one.
 */
const withPicoMobileFlavorManifest = (config) => {
    const state = getPicoFlavorManifestState(config);
    if (state.mobileWriterRegistered)
        return config;
    state.mobileWriterRegistered = true;
    return (0, config_plugins_1.withDangerousMod)(config, [
        'android',
        async (cfg) => {
            const mobilePath = path.join(cfg.modRequest.projectRoot, 'android', 'app', 'src', 'mobile', 'AndroidManifest.xml');
            const exists = fs.existsSync(mobilePath);
            const manifest = exists
                ? await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(mobilePath)
                : {
                    manifest: {
                        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
                        queries: [],
                    },
                };
            const changed = applyMobileFlavorEntries(manifest, getPicoFlavorManifestState(cfg), resolvePicoManifestRoute(cfg));
            if (!changed)
                return cfg;
            if (!exists)
                fs.mkdirSync(path.dirname(mobilePath), { recursive: true });
            await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(mobilePath, manifest);
            return cfg;
        },
    ]);
};
exports.withPicoMobileFlavorManifest = withPicoMobileFlavorManifest;
function isPicoPermission(name) {
    return !!name && (name.startsWith('com.picovr.') || name.startsWith('com.pico.'));
}
function isPicoFeature(name) {
    return !!name && name.startsWith('pico.');
}
function isPicoMetaData(name) {
    return !!name && (name.startsWith('pvr.') || name.startsWith('com.pico.'));
}
function ensureApplication(manifest) {
    var _a;
    const list = ((_a = manifest.manifest).application ?? (_a.application = []));
    if (list.length === 0)
        list.push({ $: {} });
    return list[0];
}
function upsertPermission(list, name) {
    if (!hasName(list, name))
        list.push({ $: { 'android:name': name } });
}
function upsertFeature(list, name, required) {
    const entry = {
        $: { 'android:name': name, 'android:required': required ? 'true' : 'false' },
    };
    const idx = list.findIndex((e) => e.$?.['android:name'] === name);
    if (idx === -1)
        list.push(entry);
    else
        list[idx] = entry;
}
function upsertMetaData(list, name, value) {
    const entry = { $: { 'android:name': name, 'android:value': value } };
    const idx = list.findIndex((e) => e.$?.['android:name'] === name);
    if (idx === -1)
        list.push(entry);
    else
        list[idx] = entry;
}
function hasName(list, name) {
    return list.some((entry) => entry.$?.['android:name'] === name);
}
function removeByName(list, name) {
    return list.filter((entry) => entry.$?.['android:name'] !== name);
}
//# sourceMappingURL=withPicoFlavorEntries.js.map