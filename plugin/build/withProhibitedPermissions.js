"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withProhibitedPermissions = void 0;
const config_plugins_1 = require("@expo/config-plugins");
const constants_1 = require("./constants");
/**
 * Config plugin that removes prohibited Android permissions from the manifest
 * when building for devices running Meta Horizon OS.
 */
const withProhibitedPermissions = (config) => {
    return (0, config_plugins_1.withAndroidManifest)(config, (config) => {
        const manifest = config.modResults.manifest;
        if (!manifest) {
            return config;
        }
        // Get current uses-permission entries
        const usesPermissions = manifest['uses-permission'];
        if (!usesPermissions || !Array.isArray(usesPermissions)) {
            return config;
        }
        // Filter out prohibited permissions
        manifest['uses-permission'] = usesPermissions.filter((permission) => {
            const permissionName = permission.$?.['android:name'];
            if (!permissionName) {
                return true;
            }
            // Extract the permission name without the android.permission prefix
            const shortName = permissionName.replace('android.permission.', '');
            // Keep the permission if it's not in the prohibited list
            return !constants_1.PROHIBITED_PERMISSIONS.includes(shortName);
        });
        return config;
    });
};
exports.withProhibitedPermissions = withProhibitedPermissions;
exports.default = exports.withProhibitedPermissions;
