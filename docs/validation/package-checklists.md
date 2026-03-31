# Package Proving Checklists

Use these checklists during device validation. Each package should archive:

- last successful harness result JSON
- screenshot or screen recording for user-visible flows
- exact build variant and device model
- blocking error code for any failed item

## `expo-pico-core`

- Verify `isPicoBuild`, `isPicoDevice`, target profile, app ID, and device model.
- Validate both `mobileDebug` and `picoDebug`.
- Confirm expected PICO meta-data in generated manifests.
- Capture runtime snapshot from the example harness.

## `expo-pico-spatial`

- Verify sync spatial snapshot: space state, container type, capability flags.
- Re-run on emulator and hardware to confirm expected differences.
- Trigger deferred seam actions and confirm typed `NOT_IMPLEMENTED`.
- Capture spatial runtime snapshot and seam proof.

## `expo-pico-account`

- Verify availability + SDK version on linked build.
- Attempt `getUserProfile` and `getAccountLinkStatus`.
- Confirm failure mode is normalized if native wiring is still stubbed.
- Trigger `login`, `getAccessToken`, and `logout` seam actions.

## `expo-pico-iap`

- Query products with known test SKUs.
- Fetch purchase history.
- Exercise consume flow only after a known consumable purchase exists.
- Trigger purchase seam and record expected `NOT_IMPLEMENTED` until native path exists.
- Validate unknown SKU and missing-product negative paths.

## `expo-pico-notifications`

- Record current permission status.
- Request permission on hardware.
- Re-run after permission is granted or denied.
- Trigger token-registration seam and capture the deferred result.
- Record permission behavior on Android 13+.

## `expo-pico-subscription`

- Query subscription products with known SKUs.
- Fetch active subscriptions.
- Check entitlement for known active and inactive subscription SKUs.
- Trigger `subscribe` and `cancelSubscription` seam actions.
- Validate unknown SKU and missing-billing-setup paths.

## `expo-pico-rtc`

- Initialize RTC engine with harness inputs.
- Attempt channel join with a valid token.
- Validate mute and volume operations.
- Leave channel cleanly.
- On two devices, verify join/leave/state event callbacks on both ends.
- Record invalid token and expired token failures.

## `expo-pico-rooms`

- Inspect room session snapshot.
- Create a room and capture returned room info.
- Join an existing room from a second device.
- Update room data and verify the update event.
- Leave room and, where supported, kick a member as owner.
- Trigger matchmaking seam actions and record their deferred status.

## `expo-pico-storage`

- Save an entry, then load it.
- List keys and verify the saved key appears.
- Delete the entry and confirm it is gone.
- Query quota and trigger sync.
- On two devices, stage a conflict and capture the conflict event.
- Validate missing-key and invalid-size behaviors.

## `expo-pico-social`

- Fetch current user.
- Fetch friend list.
- Check friendship status for a known friend and a non-friend.
- Send, accept, and decline friend requests across two users.
- Set and clear presence.
- Send invites and verify invite events where supported.
- Validate blocked-user and empty-list cases.

## `expo-pico-achievements`

- Fetch all achievement definitions.
- Fetch unlocked achievements subset.
- Query progress for known API names.
- Unlock a simple achievement.
- Increment a count achievement.
- Update a bitfield achievement.
- Verify unlocked event behavior if native wiring exists.

## `expo-pico-leaderboards`

- Fetch all leaderboard definitions.
- Fetch entries for an empty and a populated board.
- Fetch user entry.
- Write a score and re-read entries.
- On a second user, write a comparison score and confirm rank movement.
- Validate unknown-board and empty-board cases.
