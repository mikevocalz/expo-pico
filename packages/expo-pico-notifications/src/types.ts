// The Nitro spec is the single definition of these shapes; this module keeps
// the `./types` import path that callers and the package barrel use.
export type {
  NotificationPermissionStatus,
  NotificationPermissionResult,
  NotificationProvider,
  NotificationToken,
  PicoPushMessage,
  PicoPushRevocation,
} from './PicoNotifications.nitro';
