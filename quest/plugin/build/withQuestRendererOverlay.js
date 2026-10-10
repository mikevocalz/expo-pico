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
exports.withQuestRendererOverlay = exports.QUEST_OVERLAY_STATE = void 0;
exports.syncQuestRendererOverlay = syncQuestRendererOverlay;
const config_plugins_1 = require("@expo/config-plugins");
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const digest = (file) => (0, crypto_1.createHash)('sha256').update(fs.readFileSync(file)).digest('hex');
/** Records the copies this plugin wrote into `app/src/quest`. */
exports.QUEST_OVERLAY_STATE = '.expo-horizon-quest-overlays.json';
/** Files staged from `plugin/assets`, relative to it and to `app/src/quest`. */
const OVERLAY_FILES = [
    {
        staged: 'jniLibs/arm64-v8a/libviro_renderer.so',
        target: 'jniLibs/arm64-v8a/libviro_renderer.so',
    },
    { staged: 'androidAssets/controller_neutral.glb', target: 'assets/controller_neutral.glb' },
];
/**
 * Stages the patched Viro renderer and the controller mesh it loads into
 * `app/src/quest`, or removes the copies this plugin wrote there.
 *
 * A file at a target path is this plugin's when its state file recorded it or
 * when it is byte-for-byte the staged copy (an older @expo-pico/core wrote the
 * same files). Anything else belongs to the app: prebuild stops before
 * replacing it, and leaves it alone when the overlay is off.
 *
 * @throws when the overlay is on and a staged file is missing, or when it
 * would overwrite a file the app owns
 */
function syncQuestRendererOverlay(platformRoot, options, stagedRoot = path.resolve(__dirname, '../assets')) {
    const questRoot = path.join(platformRoot, 'app/src/quest');
    const statePath = path.join(platformRoot, 'app/src', exports.QUEST_OVERLAY_STATE);
    const previous = fs.existsSync(statePath)
        ? JSON.parse(fs.readFileSync(statePath, 'utf8'))
        : {};
    const next = {};
    const enabled = options.viroRendererOverlay;
    for (const file of OVERLAY_FILES) {
        const source = path.join(stagedRoot, file.staged);
        const target = path.join(questRoot, file.target);
        if (enabled && !fs.existsSync(source)) {
            throw new Error(`[expo-horizon-quest] Missing staged ${file.staged}. Turn viroRendererOverlay off to use a rebuilt Viro AAR.`);
        }
        const sourceDigest = fs.existsSync(source) ? digest(source) : undefined;
        const current = fs.existsSync(target) ? digest(target) : undefined;
        const ours = current !== undefined && (current === previous[file.target] || current === sourceDigest);
        if (enabled) {
            if (current !== undefined && !ours) {
                throw new Error(`[expo-horizon-quest] Review custom native override ${target} before prebuild; it was not modified.`);
            }
            if (current !== sourceDigest) {
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.copyFileSync(source, target);
            }
            next[file.target] = sourceDigest;
        }
        else if (ours) {
            fs.unlinkSync(target);
        }
    }
    if (Object.keys(next).length > 0) {
        fs.mkdirSync(path.dirname(statePath), { recursive: true });
        fs.writeFileSync(statePath, JSON.stringify(next, null, 2) + '\n');
    }
    else if (fs.existsSync(statePath)) {
        fs.unlinkSync(statePath);
    }
}
/** Runs {@linkcode syncQuestRendererOverlay} during prebuild. */
const withQuestRendererOverlay = (config, options) => (0, config_plugins_1.withDangerousMod)(config, [
    'android',
    (cfg) => {
        syncQuestRendererOverlay(cfg.modRequest.platformProjectRoot, options);
        return cfg;
    },
]);
exports.withQuestRendererOverlay = withQuestRendererOverlay;
//# sourceMappingURL=withQuestRendererOverlay.js.map