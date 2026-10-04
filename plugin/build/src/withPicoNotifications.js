"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const { withPermissions } = config_plugins_1.AndroidConfig.Permissions;
const withPicoNotifications = (config, rawOptions) => {
    const options = { requestPostNotificationsPermission: true, ...(rawOptions ?? {}) };
    if (options.requestPostNotificationsPermission) {
        config = withPermissions(config, ['android.permission.POST_NOTIFICATIONS']);
    }
    return config;
};
exports.default = withPicoNotifications;
//# sourceMappingURL=withPicoNotifications.js.map