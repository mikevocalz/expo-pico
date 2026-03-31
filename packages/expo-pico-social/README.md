# expo-pico-social

PICO platform social APIs for Expo apps — friends, presence, invites, and real-time social events on PICO OS 6 devices.

# API documentation

- [Documentation for the latest stable release](https://docs.expo.dev/versions/latest/sdk/pico-social/)
- [Documentation for the main branch](https://docs.expo.dev/versions/unversioned/sdk/pico-social/)

# Installation in managed Expo projects

For [managed](https://docs.expo.dev/archive/managed-vs-bare/) Expo projects, please follow the installation instructions in the [API documentation for the latest stable release](#api-documentation). If you follow the link and there is no documentation available then this library is not yet usable within managed projects &mdash; it is likely to be included in an upcoming Expo SDK release.

# Installation in bare React Native projects

For bare React Native projects, you must ensure that you have [installed and configured the `expo` package](https://docs.expo.dev/bare/installing-expo-modules/) before continuing.

### Add the package to your npm dependencies

```
npm install expo-pico-social
```

### Configure for Android

Add `expo-pico-core` and `expo-pico-social` to your `app.config.ts` plugins array. `expo-pico-core` must appear first. The social plugin injects the `com.picovr.platform.permission.SOCIAL` permission:

```ts
export default {
  plugins: [
    ['expo-pico-core', { picoAppId: 'your-pico-app-id', buildVariant: 'pico' }],
    'expo-pico-social',
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
} from 'expo-pico-social';

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

| Function | Description |
| --- | --- |
| `isSocialAvailable()` | Returns `true` on a PICO build with the Social SDK linked |
| `getSocialSdkVersion()` | Returns the PICO Platform SDK version string |
| `getCurrentUser()` | Returns the authenticated user's `PicoUser` profile |
| `getFriendList(pageToken?, pageSize?)` | Returns a paginated `FriendListResult` |
| `getFriendshipStatus(userId)` | Returns the `FriendshipStatus` with a given user |
| `sendFriendRequest(userId)` | Sends a friend request; returns the `FriendRequest` record |
| `acceptFriendRequest(requestId)` | Accepts an incoming friend request |
| `declineFriendRequest(requestId)` | Declines an incoming friend request |
| `removeFriend(userId)` | Removes a friend |
| `blockUser(userId)` | Blocks a user |
| `unblockUser(userId)` | Unblocks a user |
| `setPresence(options)` | Updates the current user's presence status |
| `clearPresence()` | Clears the current user's presence |
| `sendInvites(options)` | Sends invites to a destination; returns `SentInvite[]` |
| `getPendingFriendRequests()` | Returns all pending incoming `FriendRequest[]` |
| `addFriendPresenceChangedListener(cb)` | Real-time presence change events; returns `Subscription` |
| `addFriendRequestReceivedListener(cb)` | Real-time friend request events; returns `Subscription` |
| `addInviteReceivedListener(cb)` | Real-time invite events; returns `Subscription` |

## Limitations

- Android only (PICO is an Android platform)
- New Architecture only (`newArchEnabled: true` required)
- Requires `expo-pico-core` as a peer dependency
- Bridge methods return `NOT_IMPLEMENTED` until the PICO Platform SDK AAR is linked

# Contributing

Contributions are very welcome! Please refer to guidelines described in the [contributing guide]( https://github.com/expo/expo#contributing).
