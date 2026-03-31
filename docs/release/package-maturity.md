# Package Maturity Table

This table is the source of truth for prerelease tags and public support language.

| Package | Maturity | Default dist-tag | Notes |
| --- | --- | --- | --- |
| `expo-pico-core` | stable candidate | `next` until first stable publish | build/runtime foundation is closest to stable |
| `expo-pico-spatial` | beta | `next` | sync runtime surfaces are usable, async seams stay deferred |
| `expo-pico-account` | experimental | `alpha` | bridge still stubbed |
| `expo-pico-iap` | experimental | `alpha` | product/history paths need native wiring; purchase remains deferred |
| `expo-pico-notifications` | alpha | `alpha` | permission flow first, push delivery later |
| `expo-pico-subscription` | experimental | `alpha` | query surfaces need native wiring; subscribe/cancel remain deferred |
| `expo-pico-rtc` | experimental | `alpha` | multi-user service proof required |
| `expo-pico-rooms` | experimental | `alpha` | multi-user service proof required |
| `expo-pico-storage` | experimental | `alpha` | sync/conflict proof required |
| `expo-pico-social` | experimental | `alpha` | social graph proof required |
| `expo-pico-achievements` | experimental | `alpha` | console-backed service proof required |
| `expo-pico-leaderboards` | experimental | `alpha` | write/rank proof required |

## Promotion Rules

- `experimental -> alpha`: typed seams documented, package builds, harness card exists, negative-path behavior proven
- `alpha -> beta`: one-device service proof exists and docs match actual behavior
- `beta -> rc`: blocking defects resolved and release docs complete
- `rc -> stable candidate`: no unresolved blockers for the package and support claims are evidence-backed
