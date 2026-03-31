import {
  ConfigPlugin,
  AndroidConfig,
} from '@expo/config-plugins';

const { withPermissions } = AndroidConfig.Permissions;

export interface PicoNotificationsPluginOptions {
  /**
   * Android notification permission (required on API 33+).
   * @default true
   */
  requestPostNotificationsPermission?: boolean;
}

const withPicoNotifications: ConfigPlugin<PicoNotificationsPluginOptions | void> = (
  config,
  rawOptions
) => {
  const options = { requestPostNotificationsPermission: true, ...(rawOptions ?? {}) };

  if (options.requestPostNotificationsPermission) {
    config = withPermissions(config, ['android.permission.POST_NOTIFICATIONS']);
  }

  return config;
};

export default withPicoNotifications;
