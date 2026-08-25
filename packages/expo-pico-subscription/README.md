# expo-pico-subscription

[![live](https://img.shields.io/badge/PPS_1.0.x-live-1F6F3F?style=flat-square)](../../README.md#packages)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](../../docs/FAQ.md)

PICO platform subscription billing and entitlement for Expo apps.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Requires a signed-in PICO account

`@expo-pico/account` is a runtime prerequisite for this package — entitlements are per-account. It is
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
- PICO Platform Service SDK (PPS) linkage: live on `picoDebug` builds. `IapClient` + entitlement helpers from `com.pico.pps:platform-service-iap:1.0.0` (and `…:entitlement:1.0.0`) are pulled automatically from the public Bytedance Maven repo by `expo-pico-core`'s plugin, so no AAR drop is needed. Bridge methods only return `SERVICE_UNAVAILABLE` on the `mobile` flavor, on non-PICO hardware, or if Gradle was offline at prebuild time.
- Platform: Android only.
- Runtime target: PICO OS 6 (PICO 4, 4 Ultra, Swan), New Architecture.

## Runtime diagnostics

To check whether the `subscription` SDK surface is live at runtime:

```ts
import { getPlatformSdkProbe, isPlatformSdkPresent } from '@expo-pico/core';

if (isPlatformSdkPresent()) {
  const probe = await getPlatformSdkProbe();
  console.log('subscription SDK live:', probe.subscription);
}
```

Or run `npx expo-pico-doctor --fail-on-warning` before prebuild to catch misconfigs early.

Handles subscription product queries, subscription flows, entitlement verification,
and cancellation. Kept separate from `expo-pico-iap` because subscriptions have
a distinct lifecycle (renewal, grace periods, entitlement windows) that does not
apply to one-time consumable/durable products.

## Installation

```sh
yarn add @expo-pico/subscription react-native-nitro-modules
```

Add to `app.config.ts` after `expo-pico-core`:

```ts
plugins: [
  ['@expo-pico/core', { ... }],
  '@expo-pico/subscription',
]
```

If you also use `expo-pico-iap`, both plugins are safe to use together.
The PICO billing permission is injected idempotently.

## API

```ts
import {
  isSubscriptionAvailable,
  getSubscriptionProducts,
  subscribe,
  getSubscriptionEntitlement,
  getActiveSubscriptions,
  cancelSubscription,
} from '@expo-pico/subscription';
```

### Check entitlement

```ts
const entitlement = await getSubscriptionEntitlement('premium_monthly');
if (entitlement.status === 'active') {
  // unlock premium features
}
```

### Subscribe

```ts
const result = await subscribe('premium_monthly');
if (result.status === 'subscribed') {
  console.log('subscribed until:', result.subscription.currentPeriodEnd);
}
```

## Subscription vs IAP

| Concern                                | Package                  |
| -------------------------------------- | ------------------------ |
| Consumable/durable one-time purchase   | `expo-pico-iap`          |
| Recurring billing + entitlement period | `expo-pico-subscription` |

## Extension Seams

The PPS `IapClient` Maven artifact (`com.pico.pps:platform-service-iap:1.0.0`) resolves automatically on `picoDebug` builds; no AAR drop is required. A handful of subscription endpoints may still surface `NOT_IMPLEMENTED` until they ship in a future PPS release.

## Requirements

- `expo-pico-core >= 0.1.0` (peer)
- Expo SDK 56+
- New Architecture
- Android only

## Native artifacts

This package needs `com.pico.pps:platform-service-iap` on the Android classpath.

**It does not declare it.** `@expo-pico/core` declares every
`com.pico.pps` coordinate once, in the app module, and this package
reaches it through `implementation project(':expo-pico-core')`. So
installing it next to other `@expo-pico/*` packages never produces a
second declaration of the same artifact.

`platform-service-iap` is shared with `@expo-pico/iap`. Installing both emits one line, not two.

See [docs/PPS-ARTIFACTS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PPS-ARTIFACTS.md)
for the full artifact list and the two cases that can still duplicate
(a vendored AAR shadowing the Maven copy, and version skew).

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)

## License

MIT
