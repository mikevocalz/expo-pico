# expo-pico-iap

PICO store in-app purchase APIs for Expo apps.

> Part of the [`expo-pico`](https://github.com/mikevocalz/expo-pico) package family.

## Status

- Maturity: alpha
- PICO Platform Service SDK (PPS) linkage: live on `picoDebug` builds. `IapClient` from `com.pico.pps:platform-service-iap:1.0.0` is pulled automatically from the public Bytedance Maven repo by `expo-pico-core`'s plugin, so no AAR drop is needed. Bridge methods only return `SERVICE_UNAVAILABLE` on the `mobile` flavor, on non-PICO hardware, or if Gradle was offline at prebuild time.
- Platform: Android only.
- Runtime target: PICO OS 6 plus a signed-in PICO Store account.

## Install

```bash
yarn add expo-pico-core expo-pico-iap
```

## Configure

IAP requires the full Platform SDK identity quartet: `picoAppId`, `picoAppKey`, `picoMerchantId`, `picoPayKey`. The `expo-pico-doctor` will warn at prebuild time if any half is missing.

```ts
// app.config.ts
export default {
  plugins: [
    [
      '@expo-pico/core',
      {
        platformService: {
          picoAppId: process.env.PICO_PLATFORM_APP_ID,
          picoAppKey: process.env.PICO_PLATFORM_APP_KEY,
          // Both required for IAP. Doctor warns on partial identity.
          picoMerchantId: process.env.PICO_MERCHANT_ID,
          picoPayKey: process.env.PICO_PAY_KEY,
          // Optional: Global-region pair. Ships `_foreign` string resources.
          foreign: {
            picoMerchantId: process.env.PICO_MERCHANT_ID_FOREIGN,
            picoPayKey: process.env.PICO_PAY_KEY_FOREIGN,
          },
        },
        buildVariant: 'pico',
        xrMode: 'pico-os5',
      },
    ],
    '@expo-pico/iap',
  ],
};
```

Then: `npx expo prebuild --clean`.

## Usage

```ts
import {
  isIapAvailable,
  getProducts,
  getPurchaseHistory,
  consumePurchase,
  purchase,
} from '@expo-pico/iap';
import { hasIapIdentity } from '@expo-pico/core';

async function buyCurrency() {
  if (!hasIapIdentity() || !isIapAvailable()) {
    throw new Error('IAP not wired. Check platformService.picoMerchantId / picoPayKey in app.config.');
  }

  const products = await getProducts(['gold_1000', 'gold_5000']);
  console.log('Available:', products);

  // `purchase()` launches the PICO store UI and resolves with the receipt.
  const receipt = await purchase('gold_1000');
  if (receipt.state === 'purchased') {
    // Server-verify receipt.purchaseToken before granting entitlements!
    await consumePurchase(receipt.purchaseToken);
  }
}
```

## API

| Function                            | Description                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------- |
| `isIapAvailable()`                  | `true` when the IAP SDK is linked at runtime.                               |
| `getIapSdkVersion()`                | SDK version string or `'unavailable'`.                                      |
| `getProducts(skus)`                 | Queries the PICO store for product details.                                 |
| `purchase(sku)` *(seam)*            | Launches the store UI; returns a receipt. Throws `notImplementedError` until wired. PICO IAP has no headless purchase path. |
| `consumePurchase(purchaseToken)`    | Marks a consumable purchase as consumed so the user can buy again.          |
| `getPurchaseHistory()`              | Returns the user's prior purchases from the PICO store.                     |

Types: `IapProduct`, `IapPurchase`, `PurchaseResult`, `ConsumeResult`.

## Runtime diagnostics

```ts
import { getPlatformSdkProbe, hasIapIdentity } from '@expo-pico/core';

const probe = await getPlatformSdkProbe();
console.log({
  iapLive: probe.iap,
  identityWired: hasIapIdentity(),
});
```

## Limitations

- `purchase()` is a documented seam because PICO IAP requires the store's UI flow. There is no headless purchase path. The bridge method wraps the PPS `IapClient.startPurchase(...)` call directly — no AAR drop is required; the PPS Maven dep is pulled automatically on `picoDebug` builds.
- Server-side receipt verification is the app's responsibility; this package does not implement it.
- Subscription products are handled by [`expo-pico-subscription`](../expo-pico-subscription), not here.

## Links

- Top-level [README](https://github.com/mikevocalz/expo-pico#readme)
- Sibling: [`expo-pico-subscription`](../expo-pico-subscription)

## License

MIT
