# expo-pico-subscription

PICO platform subscription billing and entitlement for Expo apps.

Handles subscription product queries, subscription flows, entitlement verification,
and cancellation. Kept separate from `expo-pico-iap` because subscriptions have
a distinct lifecycle (renewal, grace periods, entitlement windows) that does not
apply to one-time consumable/durable products.

## Installation

```sh
yarn add expo-pico-subscription
```

Add to `app.config.ts` **after** `expo-pico-core`:

```ts
plugins: [
  ['expo-pico-core', { ... }],
  'expo-pico-subscription',
]
```

If you also use `expo-pico-iap`, both plugins are safe to use together —
the PICO billing permission is injected idempotently.

## API

```ts
import {
  isSubscriptionAvailable,
  getSubscriptionProducts,
  subscribe,
  getSubscriptionEntitlement,
  getActiveSubscriptions,
  cancelSubscription,
} from 'expo-pico-subscription';
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

| Concern | Package |
|---------|---------|
| Consumable/durable one-time purchase | `expo-pico-iap` |
| Recurring billing + entitlement period | `expo-pico-subscription` |

## Extension Seams

All async APIs are extension seams pending PICO IAP SDK AAR integration.

## Requirements

- `expo-pico-core >= 0.1.0` (peer)
- Expo SDK 55+
- New Architecture
- Android only
