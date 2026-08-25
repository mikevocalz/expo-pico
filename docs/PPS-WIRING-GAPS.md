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

**None.** Every call in the per-service tables of
[PPS-API-SURFACE.md](./PPS-API-SURFACE.md) now has a TypeScript surface.

Signatures and payload field names throughout came from `javap` on the
published AARs rather than inference. That mattered more than expected — the
proto package is `com.bytedance.pico.matrix.proto.v2` (not `…sdk.*.bean`),
`QueryProductSubscriptionStatusResponse.IsFreeTrial` carries a capital `I`, and
`SentInviteInfo` is snake_case (`is_active`, `lobby_session_id`). None of those
are guessable, and none would fail until an Android build.

### Pagination — resolved

`NextInfo(hasNext, nextId, bodyParams)` round-trips through an opaque
`nextPageToken` using the `encode()` / `decodeCursor()` pair in
`HybridPicoSocial`. This was never actually undecided: `getFriendList` had been
doing it since the Nitro migration. The token is emitted only when `hasNext` is
true, so "no token" and "no further pages" are the same state and callers never
read `hasNext`.

`getInvitableUsers`, `getSentInvites` and `getDestinations` all use it.

### `purchaseProduct(Product, Map)` — resolved

`subscribe()` resolves the SKU to a `Product` before purchasing and passes
`promoCode` through the extras map. See `HybridPicoSubscription.subscribe`.

### Closed in this pass

| Package   | Export                      | PPS call                                                                                                                                                                                                                   |
| --------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account` | `getAdultStatus()`          | `isAdult()` → `IsAdultResponse.adultStatus`. Exposed as tri-state `'unknown' \| 'minor' \| 'adult'` rather than a boolean: PPS distinguishes "not verified" from "confirmed minor", and an age gate needs that difference. |
| `account` | `getAuthorizedScopes()`     | `getAuthorizedScopes()` → `.authorizedScopes`                                                                                                                                                                              |
| `account` | `requestAuthScopes(scopes)` | `requestAuthScopes(List<String>)` → `.authorizedScopes`, which may be narrower than requested since the user can decline individually.                                                                                     |
| `account` | `cancelAuthorization()`     | `cancelAuthorization()` → `Task<Unit>`                                                                                                                                                                                     |
| `iap`     | `isProductPurchased(sku)`   | `queryProductPurchaseStatus(String)` → `.purchased` (nullable Wire `Boolean`; absent means false).                                                                                                                         |

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
