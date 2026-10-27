# @expo-pico/social

## 2.0.0

### Patch Changes

- e962042: PICO-only permissions and features no longer reach the Quest and mobile APKs. `com.picovr.payment.BILLING` (iap, subscription), `com.picovr.platform.permission.SOCIAL` (rooms, social) and the spatial `pico.software.*` features used to be written to the main AndroidManifest, which every flavor merges. They now go to the pico (and dual) flavor manifest through core's new `withPicoFlavorPermission` / `withPicoFlavorFeature` helpers, and a re-run of prebuild removes copies an older prebuild left in main. Apps with `buildVariant: 'mobile'` have no pico flavor and keep the entries in main. These packages now need `@expo-pico/core` 1.1.0 or newer.
- Updated dependencies [5cda191]
- Updated dependencies [dbbc8a7]
- Updated dependencies [d44e9fb]
- Updated dependencies [f63977a]
- Updated dependencies [9787b69]
- Updated dependencies [e962042]
- Updated dependencies [905365c]
- Updated dependencies [110feca]
- Updated dependencies [16f6c92]
- Updated dependencies [32ed3d5]
- Updated dependencies [0cea78f]
- Updated dependencies [29c4a8a]
- Updated dependencies [6a079be]
- Updated dependencies [a6423a2]
- Updated dependencies [0fad7d5]
- Updated dependencies [a12c25c]
  - @expo-pico/core@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies [f410e49]
  - @expo-pico/core@1.0.0
  - @expo-pico/platform-service-common@1.0.0
