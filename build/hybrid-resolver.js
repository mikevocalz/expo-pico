"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveHybridObject = resolveHybridObject;
exports.__resetHybridCache = __resetHybridCache;
/**
 * Resolves a package's HybridObject, or null when the native library is not
 * in this build (mobile flavor, non-PICO hardware, Gradle offline at prebuild).
 *
 * Nitro V1 dropped the name-based `NitroModules.createHybridObject`; each
 * package now constructs its spec class (`() => new PicoIap()`). That
 * constructor throws when the class is not registered, and every expo-pico
 * package must degrade to SERVICE_UNAVAILABLE instead of failing at module
 * load, so the throw is swallowed here. `name` keys the cache, and the result
 * is cached either way.
 */
const cache = new Map();
function resolveHybridObject(name, create) {
    if (cache.has(name))
        return cache.get(name);
    let resolved;
    try {
        resolved = create();
    }
    catch {
        resolved = null;
    }
    cache.set(name, resolved);
    return resolved;
}
/** Test seam — drops the cache so a suite can re-resolve. */
function __resetHybridCache() {
    cache.clear();
}
