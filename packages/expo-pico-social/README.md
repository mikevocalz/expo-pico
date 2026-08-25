# expo-pico-social

PICO platform social APIs for Expo apps. Friends, presence, invites, and real-time social events on PICO OS 6 devices.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Requires a signed-in PICO account

`@expo-pico/account` is a runtime prerequisite for this package — friends and presence are per-account. It is
**not** a code-level import, so nothing here fails to compile without it; calls
simply return no data or `SERVICE_UNAVAILABLE` until a PICO account is connected.

```bash
yarn add @expo-pico/account react-native-nitro-modules
```

```ts
import { login, isAccountAvailable } from '@expo-pico/account';

if (isAccountAvailable()) {
  await login(); // connect the PICO account before calling into this package
}
```

## Status

- Maturity: alpha
- PICO Platform Service SDK (PPS) linkage: live on `picoDebug` builds. `PicoSocialClient` (plus the friend client) from `com.pico.pps:platform-service-social:1.0.0` and `…:friend:1.0.0` is pulled automatically from the public Bytedance Maven repo by `expo-pico-core`'s plugin, so no AAR drop is needed. Bridge methods only return `SERVICE_UNAVAILABLE` on the `mobile` flavor, on non-PICO hardware, or if Gradle was offline at prebuild time.
- Platform: Android only.
- Runtime target: PICO OS 6 (PICO 4, 4 Ultra, Swan), New Architecture.

## Runtime diagnostics

To check whether the `social` SDK surface is live at runtime:

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

if (isPlatformSdkPresent()) {
  const probe = await getPlatformSdkProbe();
  console.log('social SDK live:', probe.social);
}
```

Or run `npx expo-pico-doctor --fail-on-warning` before prebuild to catch misconfigs early.

### Configure for Android

Add `expo-pico-core` and `expo-pico-social` to your `app.config.ts` plugins array. `expo-pico-core` must appear first. The social plugin injects the `com.picovr.platform.permission.SOCIAL` permission:

```ts
export default {
  plugins: [
    ['@expo-pico/core', { picoAppId: 'your-pico-app-id', buildVariant: 'pico' }],
    '@expo-pico/social',
  ],
};
```

Then run:

```
npx expo prebuild --clean
```

## Usage

```ts
import {
  isSocialAvailable,
  getCurrentUser,
  getFriendList,
  sendFriendRequest,
  setPresence,
  sendInvites,
  addFriendPresenceChangedListener,
  addInviteReceivedListener,
} from '@expo-pico/social';

if (isSocialAvailable()) {
  // Get current user profile
  const me = await getCurrentUser();
  console.log('Logged in as:', me.displayName);

  // Paginate friends list
  const { friends, nextPageToken } = await getFriendList(undefined, 20);

  // Send a friend request
  await sendFriendRequest('user-id-123');

  // Update presence
  await setPresence({ status: 'online', richText: 'In a match', destinationApiName: 'lobby_main' });

  // Invite friends to a destination
  await sendInvites({ destinationApiName: 'lobby_main', userIds: ['user-id-123'] });

  // Listen for real-time events
  const presenceSub = addFriendPresenceChangedListener((event) => {
    console.log(event.userId, 'changed status to', event.currentStatus);
  });
  const inviteSub = addInviteReceivedListener((event) => {
    console.log('Invite from', event.fromUser.displayName, 'to', event.destinationApiName);
  });
  // Later: presenceSub.remove(); inviteSub.remove();
}
```

## API

| Function                               | Description                                                |
| -------------------------------------- | ---------------------------------------------------------- |
| `isSocialAvailable()`                  | Returns `true` on a PICO build with the Social SDK linked  |
| `getSocialSdkVersion()`                | Returns the PICO Platform SDK version string               |
| `getCurrentUser()`                     | Returns the authenticated user's `PicoUser` profile        |
| `getFriendList(pageToken?, pageSize?)` | Returns a paginated `FriendListResult`                     |
| `getFriendshipStatus(userId)`          | Returns the `FriendshipStatus` with a given user           |
| `sendFriendRequest(userId)`            | Sends a friend request; returns the `FriendRequest` record |
| `acceptFriendRequest(requestId)`       | Accepts an incoming friend request                         |
| `declineFriendRequest(requestId)`      | Declines an incoming friend request                        |
| `removeFriend(userId)`                 | Removes a friend                                           |
| `blockUser(userId)`                    | Blocks a user                                              |
| `unblockUser(userId)`                  | Unblocks a user                                            |
| `setPresence(options)`                 | Updates the current user's presence status                 |
| `clearPresence()`                      | Clears the current user's presence                         |
| `sendInvites(options)`                 | Sends invites to a destination; returns `SentInvite[]`     |
| `getPendingFriendRequests()`           | Returns all pending incoming `FriendRequest[]`             |
| `addFriendPresenceChangedListener(cb)` | Real-time presence change events; returns `Subscription`   |
| `addFriendRequestReceivedListener(cb)` | Real-time friend request events; returns `Subscription`    |
| `addInviteReceivedListener(cb)`        | Real-time invite events; returns `Subscription`            |

## Native artifacts

This package needs `com.pico.pps:platform-service-social`, `com.pico.pps:platform-service-friend` on the Android classpath.

**It does not declare them.** `@expo-pico/core` declares every
`com.pico.pps` coordinate once, in the app module, and this package
reaches them through `implementation project(':expo-pico-core')`. So
installing it next to other `@expo-pico/*` packages never produces a
second declaration of the same artifact.

`platform-service-friend` is shared with `@expo-pico/rooms`. Installing both emits one line, not two.

See [docs/PPS-ARTIFACTS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PPS-ARTIFACTS.md)
for the full artifact list and the two cases that can still duplicate
(a vendored AAR shadowing the Maven copy, and version skew).

## Limitations

- Android only (PICO is an Android platform)
- New Architecture only (`newArchEnabled: true` required)
- Requires `expo-pico-core` as a peer dependency
- Some bridge methods may surface `NOT_IMPLEMENTED` until the corresponding PPS endpoint ships in a future PPS release. The PPS Maven deps themselves resolve automatically on `picoDebug` builds; no AAR drop is required.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
