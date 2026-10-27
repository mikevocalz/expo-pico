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
exports.withPicoOneLauncherTile = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const path = __importStar(require("path"));
const launcherTiles_1 = require("./launcherTiles");
/**
 * Keeps the app at one headset library tile. The prebuild fails when the
 * main manifest, alone or with any flavor manifest (the PICO overlay
 * included), has more than one launcher-visible activity, and
 * app/build.gradle applies the Gradle check that reads each variant's merged
 * manifest, library manifests included.
 *
 * Register it before the other mods: Expo runs the most recently registered
 * mod of each type first, so this one sees what the others wrote.
 */
const withPicoOneLauncherTile = (config) => {
    config = (0, config_plugins_1.withAppBuildGradle)(config, (config) => {
        const appModuleDir = path.join(config.modRequest.platformProjectRoot, 'app');
        config.modResults.contents = (0, launcherTiles_1.applyOneLauncherTileGradle)(config.modResults.contents, (0, launcherTiles_1.resolveOneLauncherTileScript)(config.modRequest.projectRoot, appModuleDir));
        return config;
    });
    return (0, config_plugins_1.withFinalizedMod)(config, [
        'android',
        async (config) => {
            // Finalized, so Viro's manifest mod has already added .VRActivity.
            await (0, launcherTiles_1.moveVRActivityOffMainOnDisk)(config.modRequest.platformProjectRoot);
            await (0, launcherTiles_1.assertOneLauncherTileOnDisk)(config.modRequest.platformProjectRoot);
            return config;
        },
    ]);
};
exports.withPicoOneLauncherTile = withPicoOneLauncherTile;
exports.default = exports.withPicoOneLauncherTile;
//# sourceMappingURL=withPicoOneLauncherTile.js.map