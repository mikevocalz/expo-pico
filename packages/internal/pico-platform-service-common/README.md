# @expo-pico/platform-service-common

Internal. Shared utilities for the [`expo-pico`](https://github.com/mikevocalz/expo-pico) sibling packages. `"private": true`, not published to npm.

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

Shared error codes. Every sibling throws only from this taxonomy:

- `SERVICE_UNAVAILABLE`: SDK class not found in this build. Typically means the `mobile` flavor is active, the host is not PICO hardware, Gradle could not resolve the PPS Maven artifacts at prebuild time, or — for legacy PVR surfaces only — the legacy PVR AAR was not dropped into `vendor/pico-sdk/` / `android/app/libs/`.
- `NOT_IMPLEMENTED`: method exists but native wiring is pending (documented seam).
- `NOT_SUPPORTED`: feature unavailable on this OS version / target profile.
- `INITIALIZATION_FAILED`, `INVALID_ARGUMENT`, `PERMISSION_DENIED`, `NETWORK_ERROR`, `TIMEOUT`, `UNKNOWN`.
- `BILLING_UNAVAILABLE`, `PURCHASE_CANCELLED`, `PURCHASE_ALREADY_OWNED`, `PRODUCT_NOT_FOUND`: shared by `expo-pico-iap` and `expo-pico-subscription`.

### HybridObject resolution

```ts
import { resolveHybridObject, __resetHybridCache } from '@expo-pico/platform-service-common';
```

Wraps `NitroModules.createHybridObject()` with a defensive resolver that returns
`null` rather than throwing when the native library isn't in this build (mobile
flavor, non-PICO hardware, Gradle offline at prebuild, test env). The result is
cached either way, so a missing module costs one failed lookup rather than one
per call. Siblings guard on `null` and raise `SERVICE_UNAVAILABLE` before
dispatching. `__resetHybridCache()` is a test seam that drops the cache.

### Event helpers

```ts
import { NULL_SUBSCRIPTION, type Subscription } from '@expo-pico/platform-service-common';
```

A `{ remove(): void }` subscription shape used consistently across sibling packages (achievements, rooms, social, storage unlock listeners etc.). `NULL_SUBSCRIPTION` is a no-op handle returned when listeners attach on a build where the native module is absent.

Nitro listeners are id-based rather than emitter-based: `addXListener()` returns
a numeric id, and each sibling wraps that id in a `Subscription` whose `remove()`
calls back into `removeListener(id)`. The old `createNativeEventEmitter` /
`safeAddListener` helpers were removed with the `expo-modules-core` emitter.

### Pagination

No longer exported. Nitro specs have no generics, so `PicoPage<T>` could not
survive codegen; each package now declares its own concrete page type in its
`*.nitro.ts` spec (for example `LeaderboardEntryPage` in
`PicoLeaderboards.nitro.ts`). `DEFAULT_PAGE_SIZE`, `PicoPage` and `PicoPageArgs`
were removed along with it.

How PPS `NextInfo(hasNext, nextId, bodyParams)` maps onto the family's
`nextPageToken?: string` is still undecided — see
[PPS-WIRING-GAPS.md](../../../docs/PPS-WIRING-GAPS.md).

## Why it's internal

1. The surface is shaped for our own siblings, not as a general-purpose utility library.
2. Coupling it to `@expo-pico/...` organization naming signals that the public API is the individual sibling packages. Consumers who want these error codes or subscription shapes get them transitively via their public imports.
3. It is nonetheless **published**, not `"private": true` — siblings list it in
   `dependencies` and import it at runtime, so npm has to be able to resolve it.
   "Internal" here means the API is not intended for direct consumption, not
   that the tarball is absent from the registry. It bumps in lockstep with the
   family via the `linked` group in `.changeset/config.json`.

If you want to import directly from here in application code, open an issue. The missing public export probably belongs on `expo-pico-core`.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT (same as the rest of the monorepo, even though this package isn't published).
