# expo-pico

Expo-native package family for **PICO OS 6** XR/spatial device support.

Built with Expo config plugins + Expo Modules API. Follows the architectural pattern of [expo-horizon](https://github.com/software-mansion-labs/expo-horizon).

## Packages

| Package | Status | Description |
|---------|--------|-------------|
| [`expo-pico-core`](./packages/expo-pico-core) | **v0.1** | Base PICO build config, flavors, runtime detection |
| [`expo-pico-spatial`](./packages/expo-pico-spatial) | Planned | Spatial anchoring, scene mesh, passthrough helpers |
| [`expo-pico-account`](./packages/expo-pico-account) | Planned | PICO account login and identity |
| [`expo-pico-iap`](./packages/expo-pico-iap) | Planned | PICO store in-app purchases |
| [`expo-pico-notifications`](./packages/expo-pico-notifications) | Planned | PICO push notification support |

## Quick Start

```bash
# Install core package
yarn add expo-pico-core

# Add to app.config.ts
# See packages/expo-pico-core/README.md for full configuration

# Regenerate native projects
npx expo prebuild --clean

# Run on standard Android
npx expo run:android --variant mobileDebug

# Run on PICO headset
npx expo run:android --variant picoDebug
```

## Compatibility

- **Expo SDK 55** (stable baseline)
- **New Architecture only**
- **Android / PICO OS 6**
- Forward-compatible with Expo SDK 56+ / RN 0.84.1+

## Doctor

Lint your project's PICO plugin config before prebuild:

```bash
npx expo-pico-doctor              # pretty output
npx expo-pico-doctor --json       # machine-readable
npx expo-pico-doctor --fail-on-warning  # CI gate
```

Ships with `expo-pico-core`. See §21 of ARCHITECTURE.md for the full check list.

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design document covering all 21 specification sections — Swan platform support, launcher contract, Platform SDK identity, hardware capabilities, diagnostics, and release infrastructure.

## Development

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run tests
yarn test

# Lint
yarn lint
```

## Example App

```bash
cd example
npx expo prebuild --clean
npx expo run:android --variant picoDebug
```

## License

MIT
