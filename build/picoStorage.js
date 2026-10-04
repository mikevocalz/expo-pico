"use strict";
// Two-tier hybrid storage:
//
//   - react-native-mmkv: fast local mmap-backed key/value store. Synchronous
//     reads/writes, single device. Used as the hot cache and the source of
//     truth for the UI.
//   - @expo-pico/storage: Pico cloud storage, user-account-scoped, syncs
//     across devices, has quota + conflict resolution. Used as the durable
//     backing store.
//
// Writes go to mmkv immediately (sync) and schedule a debounced cloud
// flush. Reads return the mmkv value synchronously when present; otherwise
// async-fetch from cloud and populate mmkv on resolve.
//
// On boot, call `hydrateFromCloud()` to pull cloud entries into mmkv so the
// next read is a sync cache hit. On exit / background, call `syncToCloud()`
// to flush any pending writes.
Object.defineProperty(exports, "__esModule", { value: true });
exports.picoStorage = void 0;
exports.getString = getString;
exports.setString = setString;
exports.getNumber = getNumber;
exports.setNumber = setNumber;
exports.getBoolean = getBoolean;
exports.setBoolean = setBoolean;
exports.getJSON = getJSON;
exports.setJSON = setJSON;
exports.remove = remove;
exports.getAllKeys = getAllKeys;
exports.getStringFresh = getStringFresh;
exports.syncToCloud = syncToCloud;
exports.hydrateFromCloud = hydrateFromCloud;
exports.useStorageEntry = useStorageEntry;
const react_1 = require("react");
const react_native_mmkv_1 = require("react-native-mmkv");
const picoCapabilities_1 = require("./picoCapabilities");
// react-native-mmkv 4.x removed the `new MMKV(...)` constructor in favour
// of a factory. The returned object exposes set/get*/contains/remove/
// getAllKeys/clearAll/addOnValueChangedListener — same shape as before
// except `delete` is now `remove`.
const mmkv = (0, react_native_mmkv_1.createMMKV)({ id: 'pico-hybrid-storage' });
// Keys touched since the last cloud flush. Cleared after a successful
// syncToCloud(). On reload from background we drain this set.
const dirtyKeys = new Set();
let flushTimer = null;
const DEFAULT_FLUSH_DEBOUNCE_MS = 1500;
function scheduleCloudFlush(debounceMs = DEFAULT_FLUSH_DEBOUNCE_MS) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().storage)
        return;
    if (flushTimer)
        clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        flushTimer = null;
        syncToCloud().catch(() => {
            // Swallow — the dirty set still has the key; we'll retry on next write
            // or explicit syncToCloud() call.
        });
    }, debounceMs);
}
// ───────── Public sync API (mmkv-backed) ─────────
function getString(key) {
    return mmkv.getString(key);
}
function setString(key, value) {
    mmkv.set(key, value);
    dirtyKeys.add(key);
    scheduleCloudFlush();
}
function getNumber(key) {
    return mmkv.getNumber(key);
}
function setNumber(key, value) {
    mmkv.set(key, value);
    dirtyKeys.add(key);
    scheduleCloudFlush();
}
function getBoolean(key) {
    return mmkv.getBoolean(key);
}
function setBoolean(key, value) {
    mmkv.set(key, value);
    dirtyKeys.add(key);
    scheduleCloudFlush();
}
function getJSON(key) {
    const raw = mmkv.getString(key);
    if (raw == null)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function setJSON(key, value) {
    mmkv.set(key, JSON.stringify(value));
    dirtyKeys.add(key);
    scheduleCloudFlush();
}
function remove(key) {
    mmkv.remove(key);
    dirtyKeys.add(key);
    scheduleCloudFlush();
}
function getAllKeys() {
    return mmkv.getAllKeys();
}
// ───────── Async cloud-aware operations ─────────
// Fetch from cloud if missing locally. Use this when you need
// guaranteed-fresh data (e.g. cross-device sync on app open) rather than
// the cached mmkv value.
async function getStringFresh(key) {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().storage)
        return mmkv.getString(key);
    try {
        const cloud = require('@expo-pico/storage');
        const result = await cloud.loadEntry?.(key);
        if (result?.value != null) {
            mmkv.set(key, String(result.value));
            return String(result.value);
        }
    }
    catch {
        // fall through to mmkv
    }
    return mmkv.getString(key);
}
// Drain the dirty set, writing each touched key to cloud storage. Deletions
// (mmkv hole) become cloud deleteEntry calls.
async function syncToCloud() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().storage)
        return { pushed: 0, failed: 0 };
    if (dirtyKeys.size === 0)
        return { pushed: 0, failed: 0 };
    let cloud;
    try {
        cloud = require('@expo-pico/storage');
    }
    catch {
        return { pushed: 0, failed: 0 };
    }
    let pushed = 0;
    let failed = 0;
    const keys = Array.from(dirtyKeys);
    for (const key of keys) {
        try {
            if (mmkv.contains(key)) {
                await cloud.saveEntry?.(key, mmkv.getString(key));
            }
            else {
                await cloud.deleteEntry?.(key);
            }
            dirtyKeys.delete(key);
            pushed++;
        }
        catch {
            failed++;
        }
    }
    return { pushed, failed };
}
// Pull all cloud entries into mmkv. Call once at app boot to warm the
// cache so subsequent sync reads are hits.
async function hydrateFromCloud() {
    if (!(0, picoCapabilities_1.getPicoCapabilities)().storage)
        return { pulled: 0 };
    try {
        const cloud = require('@expo-pico/storage');
        const keys = (await cloud.listKeys?.()) ?? [];
        let pulled = 0;
        for (const key of keys) {
            try {
                const result = await cloud.loadEntry?.(key);
                if (result?.value != null) {
                    mmkv.set(key, String(result.value));
                    pulled++;
                }
            }
            catch {
                // skip
            }
        }
        return { pulled };
    }
    catch {
        return { pulled: 0 };
    }
}
// ───────── React hooks ─────────
// Reactive read: returns the current mmkv value and re-renders the
// subscriber when the key changes. setValue writes through both tiers.
function useStorageEntry(key, initialValue) {
    const [value, setValueLocal] = (0, react_1.useState)(() => {
        const raw = mmkv.getString(key);
        if (raw == null)
            return initialValue;
        if (typeof initialValue === 'number')
            return Number(raw);
        if (typeof initialValue === 'boolean')
            return (raw === 'true');
        return raw;
    });
    (0, react_1.useEffect)(() => {
        const listener = mmkv.addOnValueChangedListener((changedKey) => {
            if (changedKey !== key)
                return;
            const raw = mmkv.getString(key);
            if (raw == null) {
                setValueLocal(undefined);
            }
            else if (typeof initialValue === 'number') {
                setValueLocal(Number(raw));
            }
            else if (typeof initialValue === 'boolean') {
                setValueLocal((raw === 'true'));
            }
            else {
                setValueLocal(raw);
            }
        });
        return () => listener.remove();
    }, [key, initialValue]);
    return [
        value,
        (next) => {
            mmkv.set(key, String(next));
            dirtyKeys.add(key);
            scheduleCloudFlush();
        },
    ];
}
exports.picoStorage = {
    // raw mmkv handle, exposed for callers that need batch ops
    raw: mmkv,
    getString,
    setString,
    getNumber,
    setNumber,
    getBoolean,
    setBoolean,
    getJSON,
    setJSON,
    remove,
    getAllKeys,
    getStringFresh,
    syncToCloud,
    hydrateFromCloud,
};
//# sourceMappingURL=picoStorage.js.map