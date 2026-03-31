# Phase 6 Validation Matrix

Phase 6 is the proving phase for the linked package family. The goal is to
separate:

- build and runtime smoke checks
- documented negative-path validation
- real service proof on PICO hardware
- multi-user proof for collaboration features
- deferred seams that still return typed `NOT_IMPLEMENTED`

## Package Matrix

| Package | Non-PICO build | Emulator | Real device | Two devices | Provisioning required |
| --- | --- | --- | --- | --- | --- |
| `expo-pico-core` | required | required | required | no | `PICO_APP_ID` for PICO variants |
| `expo-pico-spatial` | required | smoke only | required | no | spatial mode/profile config |
| `expo-pico-account` | required | no | required | no | account service, signed-in tester |
| `expo-pico-iap` | required | no | required | no | billing enablement, test products |
| `expo-pico-notifications` | required | partial | required | no | push enablement, backend registration |
| `expo-pico-subscription` | required | no | required | no | subscription products, entitlement config |
| `expo-pico-rtc` | required | no | required | required | RTC enablement, token service, mic permission |
| `expo-pico-rooms` | required | no | required | required | rooms/social enablement, test users |
| `expo-pico-storage` | required | no | required | preferred | cloud storage enablement |
| `expo-pico-social` | required | no | required | required | social graph + invite setup |
| `expo-pico-achievements` | required | no | required | no | achievement definitions |
| `expo-pico-leaderboards` | required | no | required | preferred | leaderboard definitions |

## Device vs Emulator Split

### Emulator is sufficient for

- `mobileDebug` and `picoDebug` build smoke
- config-plugin manifest/meta-data verification
- runtime constant and SDK-presence inspection
- example harness interaction and result-pane behavior
- negative-path checks where a package must normalize `SERVICE_UNAVAILABLE`

### Real hardware is required for

- PICO account/session-backed calls
- any platform service that depends on console enablement
- permission prompts with headset-specific behavior
- spatial runtime observations on target hardware
- any storefront or social graph interaction

### Two-device proof is required for

- `expo-pico-rtc` join, mute, leave, and event callbacks
- `expo-pico-rooms` room membership lifecycle and owner/member transitions
- `expo-pico-social` presence, invites, request acceptance, and friend-state changes

### Must stay deferred until hardware

- push delivery proof
- storefront purchase completion
- subscription entitlement transitions
- cloud-storage conflict resolution between users/devices
- rank deltas that depend on a second user writing scores

### Must stay deferred until native wiring is real

- any method whose current native bridge still returns `NOT_IMPLEMENTED`

## Provisioning Matrix

| Area | Requirement | Notes |
| --- | --- | --- |
| App registration | valid `PICO_APP_ID` | wired through `expo-pico-core` |
| Core build config | `buildVariant`, target profile, target devices, spatial mode | keep example app aligned with docs |
| Tester accounts | primary `A`, secondary `B`, optional moderator `C` | use fixed test personas |
| Billing catalog | one consumable, one durable, one monthly sub, one yearly sub | keep API names documented in repo |
| Social graph | mutual friends, pending request state, blocked state | required for rooms/social |
| RTC infra | token issuer and expiry test token | do not hardcode production tokens |
| Rooms config | room owner/member scripts and optional matchmaking pool names | matchmaking stays deferred if native seam remains |
| Storage namespace | dedicated keys for save/load/sync/conflict tests | reserve a prefix for harness writes |
| Achievements | one simple, one count, one bitfield achievement | use deterministic names in docs |
| Leaderboards | one empty board, one populated board | prefer seeded score values |
| Notifications | backend token sink and sender | permission-only proof is insufficient for delivery claims |

## Negative-Path Coverage

Every package must capture the following where relevant:

- `SERVICE_UNAVAILABLE` on non-PICO or SDK-absent builds
- `NOT_IMPLEMENTED` for deliberate seams or unlinked bridges
- permissions denied
- missing provisioning or missing service enablement
- empty datasets
- invalid IDs, bad tokens, unknown API names, or bad SKUs
- user-cancel flows for dialogs and storefront UI
- network or timeout failures for backend-backed services

## Sign-Off Criteria

Phase 6 is complete only when:

- the example app can act as the proving harness for all 12 packages
- every package has a recorded status of `passed`, `blocked`, or `deferred`
- evidence exists for each claimed environment
- two-device packages have explicit multi-user evidence before maturity upgrades
- public claims in docs point only to behavior proven in this phase
