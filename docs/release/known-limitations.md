# Known Limitations

## Stable Today

- `expo-pico-core` runtime/build inspection surfaces
- package-level availability checks and SDK version accessors
- `expo-pico-spatial` sync state and capability snapshot
- `expo-pico-notifications` permission-status snapshot

## Provisional

These APIs exist publicly but should ship with caveats until native service proof exists:

- `expo-pico-account`: `getUserProfile`, `getAccountLinkStatus`
- `expo-pico-iap`: `getProducts`, `consumePurchase`, `getPurchaseHistory`
- `expo-pico-notifications`: `requestPermissions`
- `expo-pico-subscription`: `getSubscriptionProducts`, `getActiveSubscriptions`, `getSubscriptionEntitlement`
- `expo-pico-rtc`: all async runtime APIs
- `expo-pico-rooms`: room lifecycle APIs
- `expo-pico-storage`: CRUD, sync, quota APIs
- `expo-pico-social`: user, friends, presence, invite APIs
- `expo-pico-achievements`: query and mutation APIs
- `expo-pico-leaderboards`: query and write APIs

## Intentionally Deferred Seams

- `expo-pico-spatial`: `createSpatialAnchor`, `setWindowContainerProperties`, `requestFullSpace`
- `expo-pico-account`: `login`, `getAccessToken`, `logout`
- `expo-pico-iap`: `purchase`
- `expo-pico-notifications`: `registerForPushNotifications`
- `expo-pico-subscription`: `subscribe`, `cancelSubscription`
- `expo-pico-rooms`: `requestMatchmaking`, `cancelMatchmaking`

## Release Blockers Still Outside Code

- final GitHub repository metadata for package manifests
- first-publish npm bootstrap if packages do not yet exist on the registry
- real device evidence for packages that should graduate beyond `alpha`
