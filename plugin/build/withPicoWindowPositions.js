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
exports.withPicoWindowPositions = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const path = __importStar(require("path"));
const launcherTiles_1 = require("./launcherTiles");
const picoWindows_1 = require("./picoWindows");
const GRADLE_MARKER = '// @expo-pico/core: PICO window position check';
const SCRIPT = 'pico-window-positions.gradle';
/**
 * Fails the prebuild when an activity's `pico.vr.position` would reuse
 * another activity's PICO OS 5 window or make it a popup, and has
 * app/build.gradle apply the Gradle check that reads each variant's merged
 * manifest, library manifests included.
 *
 * Register it before the other mods: Expo runs the most recently registered
 * mod of each type first, so this one sees what the others wrote.
 */
const withPicoWindowPositions = (config) => {
    config = (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
        const appModuleDir = path.join(config.modRequest.platformProjectRoot, 'app');
        config.modResults.contents = (0, launcherTiles_1.applyMarkedGradleScript)(config.modResults.contents, GRADLE_MARKER, SCRIPT, (0, launcherTiles_1.resolveCoreGradleScript)(config.modRequest.projectRoot, appModuleDir, SCRIPT));
        return config;
    });
    return (0, config_plugins_1.withFinalizedMod)(config, [
        'android',
        async (config) => {
            await (0, picoWindows_1.assertWindowPositionsOnDisk)(config.modRequest.platformProjectRoot);
            return config;
        },
    ]);
};
exports.withPicoWindowPositions = withPicoWindowPositions;
exports.default = exports.withPicoWindowPositions;
//# sourceMappingURL=withPicoWindowPositions.js.map