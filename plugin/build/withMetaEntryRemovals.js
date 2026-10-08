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
exports.withMetaEntryRemovals = exports.MOBILE_ONLY_REMOVALS = exports.LIBRARY_META_ENTRIES = exports.META_NAME_PREFIXES = void 0;
exports.removalsForFlavor = removalsForFlavor;
exports.isMetaOnlyName = isMetaOnlyName;
exports.collectMetaEntries = collectMetaEntries;
exports.mergeMetaEntries = mergeMetaEntries;
exports.applyMetaEntryRemovals = applyMetaEntryRemovals;
exports.metaFreeFlavors = metaFreeFlavors;
exports.syncMetaEntryRemovals = syncMetaEntryRemovals;
const config_plugins_1 = require("@expo/config-plugins");
// withFinalizedMod runs after every other mod, dangerous mods included.
// Imported via the deep path because some older @expo/config-plugins
// releases don't re-export it.
const finalizedModExports = require('@expo/config-plugins/build/plugins/withFinalizedMod');
const withFinalizedMod = finalizedModExports.withFinalizedMod;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const withPicoFlavorEntries_1 = require("./withPicoFlavorEntries");
const ANDROID_NS = 'http://schemas.android.com/apk/res/android';
const TOOLS_NS = 'http://schemas.android.com/tools';
/** `android:name` prefixes that only Meta Horizon OS reads. */
exports.META_NAME_PREFIXES = ['com.oculus.', 'oculus.', 'horizonos.', 'com.meta.'];
/**
 * Meta entries declared by library manifests, which a config plugin cannot
 * read. From the `viro_renderer` AAR in `@reactvision/react-viro` 3.0.2.
 */
exports.LIBRARY_META_ENTRIES = {
    permissions: ['com.oculus.permission.EYE_TRACKING'],
    features: ['oculus.software.eye_tracking'],
    applicationMetaData: [],
    activities: [],
};
/**
 * Entries removed from the mobile flavor only. Viro's QUEST mode declares
 * `android.hardware.vr.headtracking` with `required="true"` in the main
 * manifest, and Play and the package installer refuse that APK on any phone.
 * The name is not Meta-only (PICO OS reads it too, and the pico flavor
 * declares its own), so the prefix match cannot catch it. The entry is
 * removed rather than flipped to `required="false"`: no phone has VR head
 * tracking, and nothing in the mobile build reads the declaration. Runtime
 * checks go through `PackageManager.hasSystemFeature`, which does not depend
 * on it.
 */
exports.MOBILE_ONLY_REMOVALS = {
    permissions: [],
    features: ['android.hardware.vr.headtracking'],
    applicationMetaData: [],
    activities: [],
};
/** The removals a flavor manifest gets: the shared Meta set, plus the mobile-only set on mobile. */
function removalsForFlavor(flavor, entries) {
    return flavor === 'mobile' ? mergeMetaEntries(entries, exports.MOBILE_ONLY_REMOVALS) : entries;
}
/** True for an `android:name` that only means something on Meta Horizon OS. */
function isMetaOnlyName(name) {
    return !!name && exports.META_NAME_PREFIXES.some((prefix) => name.startsWith(prefix));
}
const nameOf = (entry) => entry?.$?.['android:name'];
const listOf = (owner, key) => owner?.[key] ?? [];
function addUnique(list, value) {
    if (value && !list.includes(value))
        list.push(value);
}
/**
 * Collects the Meta-only entries of a manifest: permissions, features,
 * `<application>` meta-data, and per activity its meta-data and the intent
 * filters made only of Meta categories. A filter that mixes Meta and other
 * categories is skipped, since removing it would also drop the others.
 */
function collectMetaEntries(manifest) {
    const root = manifest.manifest;
    const out = {
        permissions: [],
        features: [],
        applicationMetaData: [],
        activities: [],
    };
    for (const e of listOf(root, 'uses-permission')) {
        if (isMetaOnlyName(nameOf(e)))
            addUnique(out.permissions, nameOf(e));
    }
    for (const e of listOf(root, 'uses-feature')) {
        if (isMetaOnlyName(nameOf(e)))
            addUnique(out.features, nameOf(e));
    }
    const application = listOf(root, 'application')[0];
    for (const e of listOf(application, 'meta-data')) {
        if (isMetaOnlyName(nameOf(e)))
            addUnique(out.applicationMetaData, nameOf(e));
    }
    for (const activity of listOf(application, 'activity')) {
        const name = nameOf(activity);
        if (!name)
            continue;
        const metaData = [];
        for (const e of listOf(activity, 'meta-data')) {
            if (isMetaOnlyName(nameOf(e)))
                addUnique(metaData, nameOf(e));
        }
        const intentFilters = [];
        for (const filter of listOf(activity, 'intent-filter')) {
            const categories = listOf(filter, 'category').map(nameOf);
            if (categories.length === 0 || !categories.every(isMetaOnlyName))
                continue;
            if (listOf(filter, 'data').length > 0)
                continue;
            intentFilters.push({
                actions: listOf(filter, 'action')
                    .map(nameOf)
                    .filter((n) => !!n),
                categories: categories,
            });
        }
        if (metaData.length > 0 || intentFilters.length > 0) {
            out.activities.push({ name, metaData, intentFilters });
        }
    }
    return out;
}
/** Union of two collections, first-seen order. */
function mergeMetaEntries(a, b) {
    const out = {
        permissions: [...a.permissions],
        features: [...a.features],
        applicationMetaData: [...a.applicationMetaData],
        activities: a.activities.map((x) => ({
            name: x.name,
            metaData: [...x.metaData],
            intentFilters: [...x.intentFilters],
        })),
    };
    b.permissions.forEach((n) => addUnique(out.permissions, n));
    b.features.forEach((n) => addUnique(out.features, n));
    b.applicationMetaData.forEach((n) => addUnique(out.applicationMetaData, n));
    for (const activity of b.activities) {
        const target = out.activities.find((x) => x.name === activity.name);
        if (!target) {
            out.activities.push({
                name: activity.name,
                metaData: [...activity.metaData],
                intentFilters: [...activity.intentFilters],
            });
            continue;
        }
        activity.metaData.forEach((n) => addUnique(target.metaData, n));
        for (const filter of activity.intentFilters) {
            if (!target.intentFilters.some((f) => sameFilter(f, filter))) {
                target.intentFilters.push(filter);
            }
        }
    }
    return out;
}
function sameFilter(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
}
/**
 * Turns the entry for each name into a removal marker: an existing entry is
 * replaced (duplicates dropped), a missing one is appended.
 */
function markRemoved(owner, tag, names) {
    if (names.length === 0)
        return;
    const entries = listOf(owner, tag).slice();
    for (const name of names) {
        const hits = entries.filter((e) => nameOf(e) === name);
        const marker = { $: { 'android:name': name, 'tools:node': 'remove' } };
        if (hits.length === 0) {
            entries.push(marker);
            continue;
        }
        entries[entries.indexOf(hits[0])] = marker;
        for (const dup of hits.slice(1))
            entries.splice(entries.indexOf(dup), 1);
    }
    owner[tag] = entries;
}
function filterMarker(filter) {
    const marker = { $: { 'tools:node': 'remove' } };
    if (filter.actions.length > 0) {
        marker.action = filter.actions.map((n) => ({ $: { 'android:name': n } }));
    }
    marker.category = filter.categories.map((n) => ({ $: { 'android:name': n } }));
    return marker;
}
function filterKey(filter) {
    return JSON.stringify({
        actions: listOf(filter, 'action').map(nameOf),
        categories: listOf(filter, 'category').map(nameOf),
    });
}
/**
 * Writes a `tools:node="remove"` marker into a flavor manifest for each
 * collected entry. Activity entries go on a `tools:node="merge"` copy of the
 * activity, reusing one the manifest already has. Returns true when the
 * manifest changed. Idempotent.
 */
function applyMetaEntryRemovals(manifest, entries) {
    var _a, _b;
    const before = JSON.stringify(manifest);
    const root = manifest.manifest;
    root.$ ?? (root.$ = {});
    const hasWork = entries.permissions.length > 0 ||
        entries.features.length > 0 ||
        entries.applicationMetaData.length > 0 ||
        entries.activities.length > 0;
    if (!hasWork)
        return false;
    (_a = root.$)['xmlns:android'] ?? (_a['xmlns:android'] = ANDROID_NS);
    (_b = root.$)['xmlns:tools'] ?? (_b['xmlns:tools'] = TOOLS_NS);
    markRemoved(root, 'uses-permission', entries.permissions);
    markRemoved(root, 'uses-feature', entries.features);
    if (entries.applicationMetaData.length > 0 || entries.activities.length > 0) {
        const applications = listOf(root, 'application');
        if (applications.length === 0)
            applications.push({ $: {} });
        root.application = applications;
        const application = applications[0];
        markRemoved(application, 'meta-data', entries.applicationMetaData);
        for (const wanted of entries.activities) {
            const activities = listOf(application, 'activity');
            let activity = activities.find((a) => nameOf(a) === wanted.name);
            if (!activity) {
                activity = { $: { 'android:name': wanted.name, 'tools:node': 'merge' } };
                activities.push(activity);
            }
            application.activity = activities;
            markRemoved(activity, 'meta-data', wanted.metaData);
            if (wanted.intentFilters.length > 0) {
                const filters = listOf(activity, 'intent-filter');
                for (const filter of wanted.intentFilters) {
                    const marker = filterMarker(filter);
                    const key = filterKey(marker);
                    const idx = filters.findIndex((f) => filterKey(f) === key);
                    if (idx === -1)
                        filters.push(marker);
                    else
                        filters[idx] = marker;
                }
                activity['intent-filter'] = filters;
            }
        }
    }
    return JSON.stringify(manifest) !== before;
}
/** Flavor source sets that must not carry Meta entries, per the config. */
function metaFreeFlavors(state, questFlavor) {
    const flavors = [];
    if (state.hasPicoFlavor)
        flavors.push('pico', 'dual');
    if (questFlavor)
        flavors.push('mobile');
    return flavors;
}
/**
 * Reads `app/src/main/AndroidManifest.xml` and writes the removal markers
 * into each flavor manifest in `flavors`. The pico and dual manifests are
 * edited only when they exist (core writes them); the mobile one is created
 * when missing.
 */
async function syncMetaEntryRemovals(platformRoot, flavors) {
    if (flavors.length === 0)
        return;
    const mainPath = path.join(platformRoot, 'app', 'src', 'main', 'AndroidManifest.xml');
    const fromMain = fs.existsSync(mainPath)
        ? collectMetaEntries(await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(mainPath))
        : { permissions: [], features: [], applicationMetaData: [], activities: [] };
    const entries = mergeMetaEntries(fromMain, exports.LIBRARY_META_ENTRIES);
    for (const flavor of flavors) {
        const flavorPath = path.join(platformRoot, 'app', 'src', flavor, 'AndroidManifest.xml');
        const exists = fs.existsSync(flavorPath);
        if (!exists && flavor !== 'mobile')
            continue;
        const manifest = exists
            ? await config_plugins_1.AndroidConfig.Manifest.readAndroidManifestAsync(flavorPath)
            : { manifest: { $: { 'xmlns:android': ANDROID_NS } } };
        if (!applyMetaEntryRemovals(manifest, removalsForFlavor(flavor, entries)))
            continue;
        if (!exists)
            fs.mkdirSync(path.dirname(flavorPath), { recursive: true });
        await config_plugins_1.AndroidConfig.Manifest.writeAndroidManifestAsync(flavorPath, manifest);
    }
}
/**
 * Registers the finalized mod. Finalized, because the main manifest Viro
 * edits is written by the manifest base mod, and the pico manifest is
 * rewritten from scratch by a dangerous mod; both have run by then.
 */
const withMetaEntryRemovals = (config) => withFinalizedMod(config, [
    'android',
    async (cfg) => {
        const flavors = metaFreeFlavors((0, withPicoFlavorEntries_1.getPicoFlavorManifestState)(cfg), (0, withPicoFlavorEntries_1.hasQuestFlavor)(cfg));
        await syncMetaEntryRemovals(cfg.modRequest.platformProjectRoot, flavors);
        return cfg;
    },
]);
exports.withMetaEntryRemovals = withMetaEntryRemovals;
//# sourceMappingURL=withMetaEntryRemovals.js.map