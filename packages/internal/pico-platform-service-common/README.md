# @expo-pico/platform-service-common

**Internal.** Shared utilities for the [`expo-pico`](https://github.com/mikevocalz/expo-pico) sibling packages. `"private": true` — this package is not published to npm.

## What it provides

Consumed only by the public sibling packages (`expo-pico-account`, `expo-pico-iap`, `expo-pico-rtc`, `expo-pico-rooms`, `expo-pico-subscription`, `expo-pico-storage`, `expo-pico-social`, `expo-pico-achievements`, `expo-pico-leaderboards`, `expo-pico-notifications`). Consumers of the public packages never import from here directly.

### Error taxonomy

```ts
import {
  PicoErrorCode,
  PicoServiceError,
  isPicoServiceError,
  serviceUnavailableError,
  notImplementedError,
  notSupportedError,
  invalidArgumentError,
  nativeRejectionError,
  guardService,
  wrapNativeCall,
} from '@expo-pico/platform-service-common';
```

Shared error codes — every sibling throws only from this taxonomy:

- `SERVICE_UNAVAILABLE` — SDK class not found in this build (AAR not linked).
- `NOT_IMPLEMENTED` — method exists but native wiring is pending (documented seam).
- `NOT_SUPPORTED` — feature unavailable on this OS version / target profile.
- `INITIALIZATION_FAILED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `NETWORK_ERROR`, `TIMEOUT`, `UNKNOWN`.
- `BILLING_UNAVAILABLE`, `PURCHASE_CANCELLED`, `PURCHASE_ALREADY_OWNED`, `PRODUCT_NOT_FOUND` — shared by `expo-pico-iap` + `expo-pico-subscription`.

### Native module resolution

```ts
import { resolveNativeModule, type NativeModuleResolution } from '@expo-pico/platform-service-common';
```

Wraps `requireNativeModule` with a defensive resolver that returns `{ module: null, error }` rather than throwing when the native bridge isn't available (test env, missing autolinking, etc.). Siblings guard on the resolution before dispatching calls.

### Event helpers

```ts
import {
  createNativeEventEmitter,
  safeAddListener,
  NULL_SUBSCRIPTION,
  type Subscription,
} from '@expo-pico/platform-service-common';
```

A `{ remove(): void }` subscription shape used consistently across sibling packages (achievements, rooms, social, storage unlock listeners etc.). `NULL_SUBSCRIPTION` is a no-op handle returned when listeners attach on a build where the native module is absent.

### Pagination

```ts
import { DEFAULT_PAGE_SIZE, type PicoPage, type PicoPageArgs } from '@expo-pico/platform-service-common';
```

Standard `{ items, nextCursor, hasMore }` shape used by paginated PICO Platform APIs (leaderboards, friends list, etc.).

## Why it's internal

1. The surface is shaped for our own siblings, not as a general-purpose utility library.
2. Coupling it to `@expo-pico/...` organization naming signals that the public API is the individual sibling packages — consumers who want these error codes / subscription shapes get them transitively via their public imports.
3. Keeping it `"private": true` prevents accidental npm publish churn whenever a sibling's internal contract widens.

If you find yourself wanting to import directly from here in application code, open an issue — the missing public export probably belongs on `expo-pico-core`.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)
- [ARCHITECTURE.md](https://github.com/mikevocalz/expo-pico/blob/main/ARCHITECTURE.md)

## License

MIT (same as the rest of the monorepo, even though this package isn't published).
