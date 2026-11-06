# Your new PICO app

[![n/a](https://img.shields.io/badge/PPS_1.x-n%2Fa-0B0B0C?style=flat-square)](../../README.md#packages)
[![Android](https://img.shields.io/badge/platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white)](../../docs/FAQ.md)

Welcome. This project was bootstrapped from [`expo-pico-template`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-template) and ships with everything wired to build and install on PICO 4 / 4 Ultra / Swan.

## What's already wired

`app.config.ts`:

- New Architecture on (`newArchEnabled: true`). Required by `expo-pico-core`.
- `xrMode: 'pico-os5'`. Selects the PICO OS 5 runtime `PicoCorePackage` starts at app boot. Flip to `'pico-swan'` when you target Swan hardware.
- `appType: '2d'`. Opens the starter's native React Native panel. Add a 3D renderer before opting into an immersive activity.
- `buildVariant: 'pico'`. Writes the PICO product flavor, ABI filter, and flavor-scoped manifest.
- `platformService.picoAppId` / `picoAppKey`. Read from `process.env`. Populate via EAS Secrets in CI or a `.env` file locally.
- Hardware capabilities are commented out until your app uses them. Declaring a capability does not implement a tracking API or add a renderer.

Starter `App.tsx`:

- Live runtime HUD showing every field of `getPicoRuntimeInfo()` (xrMode, appType, device/build flavor, identity, Platform SDK presence).
- Diagnostics card running `getPicoDiagnostics()` on mount. Flags any config miss before you build.
- Platform SDK probe card running `getPlatformSdkProbe()`. Shows which sibling SDK surfaces (account, iap, notifications, rtc, etc.) are live vs stubbed.

## First run

```bash
npm run doctor
npm run pico
```

Expo generates `android/` on the first run. After changing native configuration,
run `npm run prebuild`. `npm run android:mobile` builds the standard Android
variant. The release contains its generated Nitro bindings and compiled Eskiu
runtime; standard Android build tools are sufficient, with no separate custom
compiler or manual AAR staging.

`identity.missing` is informational for this panel starter. Set these values
when your app uses PICO account, purchase or other Platform Services:

```bash
export PICO_PLATFORM_APP_ID=your-app-id
export PICO_PLATFORM_APP_KEY=your-app-key
```

Register the identity at [developer.picoxr.com](https://developer.picoxr.com/).
PPS libraries are resolved automatically from Maven during the Gradle build.
For an immersive PICO OS 5 app, also set `PICO_APP_ID` to the ID registered for
your Android package: building without it is possible, but the headset's
entitlement check can prevent immersive launch.

## Adding sibling packages

The template ships only `expo-pico-core`. Add the ones you need:

```bash
# Shared service helpers and account support:
npm install "github:mikevocalz/expo-pico#release/platform-service-common" "github:mikevocalz/expo-pico#release/account"

# Add purchases when needed:
npm install "github:mikevocalz/expo-pico#release/iap"
```

Packages are installed from GitHub release branches. See the
[branch map and peer dependencies](https://github.com/mikevocalz/expo-pico/blob/main/docs/INSTALL-FROM-GITHUB.md)
and [current support matrix](https://github.com/mikevocalz/expo-pico#packages).
RTC, cloud storage and some spatial/tracking APIs are not implemented by these
packages; an SDK archive does not enable those methods.

Account autolinks and uses Core's Platform Service configuration; it has no
separate config plugin. Add plugin entries for packages that expose one:

```ts
plugins: [
  ['@expo-pico/core', { /* ... */ }],
  '@expo-pico/iap',
  ['@expo-pico/notifications', { requestPostNotificationsPermission: true }],
  ['@expo-pico/rtc', { microphonePermission: true }],
],
```

Per-sibling docs: each package ships a README with a usage snippet, API table, and runtime-probe pattern. Source packages:

- [expo-pico-core](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-core): the plugin family's foundation.
- [expo-pico-spatial](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-spatial): spatial anchors, containers, space states.
- [expo-pico-account](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-account): PICO account identity.
- [expo-pico-iap](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-iap): in-app purchases.
- [expo-pico-subscription](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-subscription): subscription billing.
- [expo-pico-notifications](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-notifications): push registration and tokens.
- [expo-pico-rtc](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-rtc): unavailable in PPS; use a supported RTC provider.
- [expo-pico-rooms](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-rooms): friend/room discovery; room creation and matchmaking need a backend.
- [expo-pico-social](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-social): friends, presence, invites.
- [expo-pico-achievements](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-achievements): achievements.
- [expo-pico-leaderboards](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-leaderboards): leaderboards.
- [expo-pico-storage](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-storage): unavailable in PPS; use your backend for cloud storage.

## Adding a 3D renderer

The starter does not include a 3D renderer. Install a Viro release with matching
native renderer and bridge artifacts, following the
[Viro integration guide](https://github.com/mikevocalz/expo-pico/blob/main/docs/VIRO-PICO-INTEGRATION.md).
Then configure an immersive PICO activity:

```ts
plugins: [
  ['@reactvision/react-viro', { android: { xRMode: ['PICO'] } }],
  ['@expo-pico/core', {
    xrMode: 'pico-os5',
    buildVariant: 'pico',
    appType: 'vr',
    picoAppId: process.env.PICO_APP_ID,
  }],
],
```

See [FAQ #5](https://github.com/mikevocalz/expo-pico/blob/main/docs/FAQ.md#5-which-renderer-should-i-use) for plugin-ordering notes.

## Art, icons, and splash

`app.config.ts` intentionally does not reference an `icon` or `splash`. The template doesn't ship placeholder artwork because unbranded placeholders routinely make it into Store submissions. When you're ready:

```bash
mkdir assets
# drop your icon.png + splash.png in
```

Then uncomment the commented `icon:` and `splash:` lines in `app.config.ts`.

## Shipping

- [docs/QUICKSTART.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/QUICKSTART.md): full bootstrap guide.
- [docs/EAS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/EAS.md): EAS Build profiles, secrets, and PICO Store submission.
- [docs/FAQ.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/FAQ.md): common gotchas answered.

## License

This template ships under MIT. See `LICENSE`. The package name and the `expo-pico-*` naming convention belong to the `expo-pico` project. Feel free to rename your app to anything you like; the plugin wiring travels with your source, not the name.
