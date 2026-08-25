# Wiring audit — TypeScript surface vs. the real PPS SDK

Compares each package's public API against the signatures in
[PPS-API-SURFACE.md](./PPS-API-SURFACE.md), which came from the published
artifacts. "Missing" means PPS offers it and the family does not; "unbacked"
means the family exposes it and PPS has no such call.

## Unbacked — exposed but nothing in PPS implements it

| Package   | Export                   | Finding                                                                                                                                                                                                                                                                                                                 |
| --------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account` | `getAccountLinkStatus()` | ~~**`ISignInClient` has no account-linking call.**~~ **Resolved in the Nitro migration.** `HybridPicoAccount` resolves `PicoAccountLinkStatus.UNSUPPORTED` instead of throwing, so callers get a typed answer rather than an error. The `'unsupported'` member of `PicoAccountLinkStatus` exists for exactly this case. |

## Missing — real PPS calls with no TypeScript surface

| Package         | PPS method                                                                                                                                                                                                                          | Why it matters                                                                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`       | `isAdult()`                                                                                                                                                                                                                         | Age gate. Store-compliance relevant.                                                                                                                          |
| `account`       | `requestAuthScopes(List<String>)`, `getAuthorizedScopes()`, `sendAuthScopesRequest(...)`                                                                                                                                            | OAuth scope management. `signIn` already takes a `scopeList`, so scopes are part of the model whether or not they're exposed.                                 |
| `account`       | `cancelAuthorization()`                                                                                                                                                                                                             | Revoke consent.                                                                                                                                               |
| `iap`           | `queryProductPurchaseStatus(String)`                                                                                                                                                                                                | Per-SKU ownership check without pulling the whole purchase list.                                                                                              |
| `subscription`  | `queryProductSubscriptionStatus(String)`                                                                                                                                                                                            | **A real subscription-status call exists.** The package currently routes everything through IAP and treats status as unavailable.                             |
| `achievements`  | `getDefinitionsByName(String[])`, `getAllProgress(int,int)`                                                                                                                                                                         | Targeted definition lookup; paginated progress.                                                                                                               |
| `leaderboards`  | `getEntriesByIds(String,int,int,int,List<String>)`                                                                                                                                                                                  | **`getUserEntry` is emulated by scanning entries. It does not need to be** — this fetches specific users directly.                                            |
| `leaderboards`  | `writeEntryWithSupplementaryMetric(...)`                                                                                                                                                                                            | The TS API takes `supplementaryMetric` as an option but PPS exposes it as a separate method.                                                                  |
| `social`        | `getInvitableUsers`, `launchPresenceInvitePanel`, `launchInviteUserJoinRoomFlow`, `getSentInvites`, `getDestinations`, `launchApp`, `launchStore`, `getLaunchDetails`, `setLaunchIntentChangeCallback`, `shareVideo`, `shareImages` | The social artifact is far richer than the package uses. `getLaunchDetails()` is synchronous and is how an app reads why it was launched (invite, deep link). |
| `notifications` | `unRegister`, `setPushMsgReceiver`, `removePushMsgReceiver`                                                                                                                                                                         | Only `register` is wired. **Without `setPushMsgReceiver` the app cannot actually receive a push** — it can only obtain a token.                               |

## Services with no package at all

| Artifact                       | Entry point                                                                     | Notes                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `platform-service-entitlement` | `PicoEntitlementClient.getEntitlementClient` → `entitlementCheck(boolean)`      | DRM / ownership verification. `expo-pico-core` already declares an `entitlementCheck` capability flag, so the plugin knows about it while no package implements it. |
| `platform-service-compliance`  | `PicoComplianceClient.getComplianceClient` → `detectSensitive(int, String)`     | Content moderation for UGC.                                                                                                                                         |
| `platform-service-sport`       | `PicoSportClient.getSportClient` → `getUserInfo / getDailySummary / getSummary` | Fitness data.                                                                                                                                                       |
| `platform-service-speech`      | `PicoSpeechClient.getSportClient` → ASR engine                                  | On-device speech recognition. Note the misnamed getter.                                                                                                             |

## Confirmed correct

- **rooms** — `getFriendsAndRooms()` is now exported (read-only discovery
  feed); every mutating call remains a correct `NOT_IN_PPS_1_0` seam.
- **rooms, rtc, storage** — no such artifacts exist on the repo. The
  `NOT_IN_PPS_1_0` seams are accurate, and read-only rooms via
  `friend.getFriendsAndRooms()` is the only real path.
- **social** accept / decline / remove / block / unblock — absent from
  `IFriendClient`. Those seams are accurate.
- **subscription has no separate client** — correct, it lives on `IapClient`.

## Two shape mismatches that will bite the Kotlin bridge

1. `purchaseProduct(Product, Map<String,String>)` takes a **`Product` message
   and an extras map**, not a SKU string. The TS `purchase(sku: string)` cannot
   map one-to-one; the bridge has to fetch or construct a `Product` first.
2. Pagination is `NextInfo(hasNext, nextId, bodyParams)` passed back into
   `getNext…` methods. The family models pagination as
   `nextPageToken?: string`. A token string can carry a serialised `NextInfo`,
   but the bridge owns that encoding and it needs deciding before the Kotlin
   is written.
