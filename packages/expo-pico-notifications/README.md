# expo-pico-notifications

PICO push notification registration and token APIs for Expo apps.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Status

- Maturity: alpha
- PICO Platform Service SDK (PPS) linkage: live on `picoDebug` builds. The PPS push client from `com.pico.pps:platform-service-push:1.0.0` is pulled automatically from the public Bytedance Maven repo by `expo-pico-core`'s plugin, so no AAR drop is needed. Registration / token bridge methods only return `SERVICE_UNAVAILABLE` on the `mobile` flavor, on non-PICO hardware, or if Gradle was offline at prebuild time.
- Platform: Android only.
- Runtime target: PICO OS 6. Requires the user to have PICO Platform Services available (default on PICO hardware).

## Install

```bash
yarn add expo-pico-core expo-pico-notifications
```

## Configure

```ts
// app.config.ts
export default {
  plugins: [
    [
      '@expo-pico/core',
      {
        platformService: {
          picoAppId: process.env.PICO_PLATFORM_APP_ID,
          picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
        },
        buildVariant: 'pico',
        xrMode: 'pico-os5',
      },
    ],
    [
      '@expo-pico/notifications',
      {
        // Android 13+ requires runtime POST_NOTIFICATIONS consent.
        // Default: true. Set to false to skip the manifest entry.
        requestPostNotificationsPermission: true,
      },
    ],
  ],
};
```

Then: `npx expo prebuild --clean`.

## Usage

```ts
import {
  isNotificationsAvailable,
  getNotificationPermissionStatus,
  requestPermissions,
  registerForPushNotifications,
} from '@expo-pico/notifications';

async function setupPush() {
  if (!isNotificationsAvailable()) return null;

  // Request runtime permission on Android 13+.
  const status = getNotificationPermissionStatus();
  if (status !== 'granted') {
    const result = await requestPermissions();
    if (result.status !== 'granted') return null;
  }

  // Register with the PICO push service; returns a PICO-specific token.
  const token = await registerForPushNotifications();
  console.log('PICO push token:', token.value);

  // Send `token.value` to your backend. Your server delivers through
  // the PICO Platform push endpoint using the same picoAppId/picoAppKey
  // the app was built with.
  return token;
}
```

## API

| Function                              | Description                                                             |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `isNotificationsAvailable()`          | `true` when the PICO Push SDK is linked.                                |
| `getNotificationsSdkVersion()`        | SDK version string or `'unavailable'`.                                  |
| `getNotificationPermissionStatus()`   | Sync snapshot of the current runtime permission grant state.            |
| `requestPermissions()`                | Prompts the user for `POST_NOTIFICATIONS` (Android 13+ / API 33+).      |
| `registerForPushNotifications()`      | Returns a PICO push token to forward to your backend.                   |

Types: `NotificationToken`, `NotificationPermissionStatus`, `NotificationPermissionResult`.

## Runtime diagnostics

```ts
import { getPlatformSdkProbe } from '@expo-pico/core';

const probe = await getPlatformSdkProbe();
console.log('Push SDK live:', probe.notifications);
```

The `DiagnosticsPanel` shows the `permission.ungranted:android.permission.POST_NOTIFICATIONS` info when the user hasn't accepted the runtime prompt yet.

## Limitations

- Delivery is the backend's responsibility; this package only handles registration and token retrieval on the client.
- Android 13+ requires runtime `POST_NOTIFICATIONS` consent. The plugin option `requestPostNotificationsPermission: true` (default) declares the permission; the app must call `requestPermissions()` at the feature-use site.
- Foreground notification event listeners (e.g. `addNotificationReceivedListener`) are a future addition. Today the package exposes only registration and permission flow.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
