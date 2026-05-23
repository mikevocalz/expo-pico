# Your new PICO app

Welcome. This project was bootstrapped from [`expo-pico-template`](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-template) and ships with everything wired to build and install on PICO 4 / 4 Ultra / Swan.

## What's already wired

`app.config.ts`:

- **New Architecture** on (`newArchEnabled: true`) — required by `expo-pico-core`.
- **`xrMode: 'pico-os6'`** — registers `PicoCorePackage(PicoXRPlatform.PICO_OS6)` at app boot. Flip to `'pico-swan'` when you target Swan hardware.
- **`appType: 'vr'`** — emits `pvr.app.type=vr`, OpenXR `IMMERSIVE_HMD` and `com.pico.intent.category.VR` on the launcher activity, and the PICO system-package `<queries>` block. The APK will show up in the PICO launcher's VR section.
- **`buildVariant: 'pico'`** — writes the PICO product flavor, ABI filter, and flavor-scoped manifest.
- **`platformService.picoAppId` / `picoAppKey`** — read from `process.env`. Populate via EAS Secrets in CI or a `.env` file locally.
- **`handTracking: true`**, **`passthrough: true`**, **`highSamplingRateSensors: true`** — sensible defaults for an immersive app. Every other capability is commented out in `app.config.ts` ready to uncomment.

Starter `App.tsx`:

- Live runtime HUD showing every field of `getPicoRuntimeInfo()` (xrMode, appType, device/build flavor, identity, Platform SDK presence).
- Diagnostics card running `getPicoDiagnostics()` on mount — flags any config miss before you build.
- Platform SDK probe card running Phase J's `getPlatformSdkProbe()` — shows which sibling SDK surfaces (account, iap, notifications, rtc, etc.) are live vs stubbed.

## First run

```bash
# 1. Sanity-check the config before touching native files.
npx expo-pico-doctor

# 2. Regenerate native projects. This creates android/ with the PICO
#    flavor manifest, launcher categories, ABI filter, and everything
#    else from expo-pico-core.
npx expo prebuild --clean

# 3a. Run on standard Android (no headset required — useful for UI dev).
npx expo run:android --variant mobileDebug

# 3b. Run on a connected PICO headset.
npx expo run:android --variant picoDebug
```

If the doctor warns about `identity.missing`, set these env vars before prebuild:

```bash
export PICO_PLATFORM_APP_ID=your-app-id
export PICO_PLATFORM_APP_KEY=your-app-key
```

You get these by registering at [developer.picoxr.com](https://developer.picoxr.com/). The app will still build and launch without them — just any PICO Platform SDK call (account, IAP, etc.) returns `SERVICE_UNAVAILABLE`.

## Adding sibling packages

The template ships only `expo-pico-core`. Add the ones you need:

```bash
# Voice + multiplayer:
yarn add expo-pico-rtc expo-pico-rooms expo-pico-social

# Paid apps:
yarn add expo-pico-iap expo-pico-subscription

# Live services:
yarn add expo-pico-account expo-pico-notifications expo-pico-achievements expo-pico-leaderboards
```

Each sibling needs a plugin entry in `app.config.ts`:

```ts
plugins: [
  ['@expo-pico/core', { /* ... */ }],
  '@expo-pico/account',
  '@expo-pico/iap',
  ['@expo-pico/notifications', { requestPostNotificationsPermission: true }],
  ['@expo-pico/rtc', { microphonePermission: true }],
],
```

Per-sibling docs: each package ships a README with a usage snippet, API table, and runtime-probe pattern. Entry points on npm or in the monorepo:

- [expo-pico-core](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-core) — the plugin family's foundation.
- [expo-pico-spatial](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-spatial) — spatial anchors, containers, space states.
- [expo-pico-account](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-account) — PICO account identity.
- [expo-pico-iap](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-iap) — in-app purchases.
- [expo-pico-subscription](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-subscription) — subscription billing.
- [expo-pico-notifications](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-notifications) — push registration + tokens.
- [expo-pico-rtc](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-rtc) — real-time voice.
- [expo-pico-rooms](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-rooms) — rooms + matchmaking.
- [expo-pico-social](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-social) — friends, presence, invites.
- [expo-pico-achievements](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-achievements) — achievements.
- [expo-pico-leaderboards](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-leaderboards) — leaderboards.
- [expo-pico-storage](https://github.com/mikevocalz/expo-pico/tree/main/packages/expo-pico-storage) — cloud storage.

## Adding a 3D renderer

The plugin is renderer-agnostic — nothing in it touches the rendering stack. Two well-tested options:

**react-three-fiber + three:**

```bash
yarn add @react-three/fiber expo-gl expo-asset three
yarn add -D @types/three
```

**Babylon React Native:**

```bash
yarn add @babylonjs/react-native @babylonjs/core
```

See [FAQ #5](https://github.com/mikevocalz/expo-pico/blob/main/docs/FAQ.md#5-can-i-use-babylon-react-native-instead-of-react-three-fiber) for the plugin-ordering rule when composing multiple XR plugins.

## Art, icons, and splash

`app.config.ts` intentionally does not reference an `icon` or `splash` — the template doesn't ship placeholder artwork because unbranded placeholders routinely make it into Store submissions. When you're ready:

```bash
mkdir assets
# drop your icon.png + splash.png in
```

Then uncomment the commented `icon:` and `splash:` lines in `app.config.ts`.

## Shipping

- **[docs/QUICKSTART.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/QUICKSTART.md)** — full 9-step bootstrap guide (you just did §1–§5).
- **[docs/EAS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/EAS.md)** — EAS Build profiles + secrets + PICO Store submission.
- **[docs/PRODUCTION-READINESS.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/PRODUCTION-READINESS.md)** — pre-submit checklist.
- **[docs/FAQ.md](https://github.com/mikevocalz/expo-pico/blob/main/docs/FAQ.md)** — common gotchas answered.

## License

This template ships under MIT. See `LICENSE`. The package name and the `expo-pico-*` naming convention belong to the `expo-pico` project — feel free to rename your app to anything you like; the plugin wiring travels with your source, not the name.
