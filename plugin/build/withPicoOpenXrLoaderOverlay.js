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
exports.withPicoOpenXrLoaderOverlay = void 0;
exports.syncPicoOverlays = syncPicoOverlays;
const config_plugins_1 = require("@expo/config-plugins");
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const digest = (file) => (0, crypto_1.createHash)('sha256').update(fs.readFileSync(file)).digest('hex');
/**
 * The only ABI these overlays are staged for.
 *
 * PICO ships no 32-bit device, and `scripts/verify-16kb-alignment.py` — the
 * one thing in this repo that can vouch for a staged binary — reads 64-bit
 * ELF only. Staging `armeabi-v7a` would put a library nothing here can check
 * into the source set, and `ndkAbiFilters: false` is a supported option, so
 * the Gradle ABI filter is not a guarantee it stays out of the APK.
 *
 * A copy an earlier plugin version staged is still removed: cleanup walks the
 * recorded `.expo-pico-overlays.json` state, not just the current ABI list.
 */
const OVERLAY_ABI = 'arm64-v8a';
/**
 * Compatibility overlays for older AARs. The native ViroCore renderer remains
 * authoritative; modern paired AAR builds can disable both overlays. ELF page
 * alignment must be checked in the resulting artifact, independent of OS name.
 * Record hashes so incremental prebuild updates and removals preserve user files.
 */
function syncPicoOverlays(platformRoot, options, stagedRoot = path.resolve(__dirname, '../assets')) {
    const sourceRoot = path.join(platformRoot, 'app/src');
    const statePath = path.join(sourceRoot, '.expo-pico-overlays.json');
    const previous = fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
        : {};
    const next = {};
    const active = options.xrMode !== 'mobile' && options.buildVariant !== 'mobile';
    const flavors = active ? (options.buildVariant === 'dual' ? ['pico', 'dual'] : ['pico']) : [];
    const staged = [];
    for (const library of ['libopenxr_loader.so', 'libviro_renderer.so']) {
        const enabled = active &&
            (library === 'libopenxr_loader.so'
                ? options.openXrLoaderOverlay
                : options.viroRendererOverlay);
        const relative = path.join('jniLibs', OVERLAY_ABI, library);
        const source = path.join(stagedRoot, relative);
        if (enabled && !fs.existsSync(source)) {
            throw new Error(`[expo-pico-core] Missing staged ${relative}. Disable the overlay to use a rebuilt AAR.`);
        }
        if (fs.existsSync(source))
            staged.push({ relative, source, enabled });
    }
    const assets = path.join(stagedRoot, 'androidAssets');
    if (fs.existsSync(assets)) {
        for (const name of fs.readdirSync(assets)) {
            const source = path.join(assets, name);
            if (fs.statSync(source).isFile())
                staged.push({
                    relative: path.join('assets', name),
                    source,
                    enabled: active && options.viroRendererOverlay,
                });
        }
    }
    const desired = new Map();
    const known = new Map();
    for (const entry of staged) {
        for (const flavor of ['main', 'pico', 'dual']) {
            const relative = path.join(flavor, entry.relative);
            known.set(relative, digest(entry.source));
            if (entry.enabled && flavors.includes(flavor))
                desired.set(relative, entry.source);
        }
    }
    // Clean only content we can attribute to this plugin. Unknown legacy files
    // must be reviewed explicitly; silently keeping them can mask a new AAR.
    for (const relative of new Set([...Object.keys(previous), ...known.keys()])) {
        const target = path.resolve(sourceRoot, relative);
        if (!target.startsWith(path.resolve(sourceRoot) + path.sep)) {
            throw new Error('[expo-pico-core] Invalid overlay state path');
        }
        if (fs.existsSync(target)) {
            const current = digest(target);
            if (current !== previous[relative] && current !== known.get(relative)) {
                throw new Error(`[expo-pico-core] Review custom native override ${target} before prebuild; it was not modified.`);
            }
        }
    }
    for (const relative of new Set([...Object.keys(previous), ...known.keys()])) {
        const target = path.resolve(sourceRoot, relative);
        const source = desired.get(relative);
        if (fs.existsSync(target)) {
            if (!source)
                fs.unlinkSync(target);
        }
        if (source) {
            fs.mkdirSync(path.dirname(target), { recursive: true });
            if (!fs.existsSync(target) || digest(target) !== known.get(relative)) {
                fs.copyFileSync(source, target);
            }
            next[relative] = digest(source);
        }
    }
    fs.mkdirSync(sourceRoot, { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(next, null, 2) + '\n');
}
const withPicoOpenXrLoaderOverlay = (config, options) => (0, config_plugins_1.withDangerousMod)(config, [
    'android',
    (cfg) => {
        syncPicoOverlays(cfg.modRequest.platformProjectRoot, options);
        return cfg;
    },
]);
exports.withPicoOpenXrLoaderOverlay = withPicoOpenXrLoaderOverlay;
//# sourceMappingURL=withPicoOpenXrLoaderOverlay.js.map