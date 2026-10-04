import { ConfigPlugin } from '@expo/config-plugins';
/**
 * Config plugin that removes prohibited Android permissions from the manifest
 * when building for devices running Meta Horizon OS.
 */
export declare const withProhibitedPermissions: ConfigPlugin;
export default withProhibitedPermissions;
