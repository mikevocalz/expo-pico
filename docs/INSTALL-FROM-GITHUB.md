# Installing expo-pico from GitHub

expo-pico is not on npm. Every package installs from a branch of this repo instead, the same way the ViroReact fork does.

Each push to `main` runs [`.github/workflows/release-branches.yml`](../.github/workflows/release-branches.yml). It builds the workspace, runs `npm pack` on each package, and commits the packed contents to that package's own `release/<name>` branch. The package root is the branch root, with `build/`, `plugin/build/`, `cli/build/` and `android/` already in place. Library release manifests have no `scripts`, so nothing builds or runs at install time. The app template retains its development commands and dependencies. pnpm needs no `allowBuilds` entry for these packages.

## Branches

| Package                              | Branch                            |
| ------------------------------------ | --------------------------------- |
| `@expo-pico/core`                    | `release/core`                    |
| `@expo-pico/platform-service-common` | `release/platform-service-common` |
| `@expo-pico/spatial`                 | `release/spatial`                 |
| `@expo-pico/account`                 | `release/account`                 |
| `@expo-pico/iap`                     | `release/iap`                     |
| `@expo-pico/subscription`            | `release/subscription`            |
| `@expo-pico/achievements`            | `release/achievements`            |
| `@expo-pico/leaderboards`            | `release/leaderboards`            |
| `@expo-pico/social`                  | `release/social`                  |
| `@expo-pico/notifications`           | `release/notifications`           |
| `@expo-pico/rooms`                   | `release/rooms`                   |
| `@expo-pico/rtc`                     | `release/rtc`                     |
| `@expo-pico/storage`                 | `release/storage`                 |
| `@expo-pico/app-kit`                 | `release/app-kit`                 |
| `@expo-pico/template`                | `release/template`                |
| `expo-horizon-core`                  | `release/horizon-core`            |

The rule: drop the `@expo-pico/` scope. `expo-horizon-core` is the one exception and lives on `release/horizon-core`.

## pnpm

```json
{
  "dependencies": {
    "@expo-pico/core": "github:mikevocalz/expo-pico#release/core",
    "@expo-pico/platform-service-common": "github:mikevocalz/expo-pico#release/platform-service-common",
    "@expo-pico/account": "github:mikevocalz/expo-pico#release/account",
    "expo-horizon-core": "github:mikevocalz/expo-pico#release/horizon-core"
  }
}
```

List every expo-pico package your app uses, plus the ones they need as peers:

- Every package except `core`, `platform-service-common` and `template` peers on `@expo-pico/core`.
- Every package except `platform-service-common`, `app-kit` and `template` peers on `react-native-nitro-modules`. Install the Nitro V1 build the workspace pins, `1.0.0-alpha.nightly.120.g33ef045b96c0`, from npm. That release depends on `nitro-core` at the same exact version, so installing it brings the matching `nitro-core` along. The packages also list `nitro-core` as an optional peer with the same `>=` floor, so the package manager checks an older `nitro-core` against it but does not ask for one when it is absent.
- `account`, `iap`, `subscription`, `achievements`, `leaderboards`, `social`, `notifications`, `rooms`, `rtc`, `storage` and `spatial` also peer on `@expo-pico/platform-service-common`.

Inside the monorepo these are regular dependencies. The release manifests turn them into peers because pnpm 12 refuses a git dependency that sits below the top level (`ERR_PNPM_EXOTIC_SUBDEP`, controlled by `blockExoticSubdeps`). A peer is resolved from your app's own `package.json`, where a git dependency is allowed. If you leave one out, pnpm tries to auto-install the peer from the npm registry and fails with a 404, because these packages are not published there.

### Pinning a commit

A branch spec follows the newest release. To lock a version, pin the release commit SHA instead:

```json
"@expo-pico/core": "github:mikevocalz/expo-pico#<commit-sha>"
```

Find the SHA with `git ls-remote https://github.com/mikevocalz/expo-pico release/core`, or from the branch history on GitHub. Release branches only move forward: each release is committed on top of the previous one and nothing is force-pushed, so a pinned SHA stays reachable. Each release commit's message is `release <name>@<version> from <source-sha>`. The packed `package.json` carries the same source commit in `gitHead` and `expoPico.sourceCommit`.

Each release also gets an annotated tag `<name>@<version>+<source-short-sha>`, for example `@expo-pico/core@1.0.0+57680c9`. The tag points at the release commit, so `#<tag>` works in place of a SHA.

## npm and yarn

The spec is the same string:

```bash
npm install "github:mikevocalz/expo-pico#release/core" "github:mikevocalz/expo-pico#release/platform-service-common"
yarn add "github:mikevocalz/expo-pico#release/core" "github:mikevocalz/expo-pico#release/platform-service-common"
```

npm also reports missing peers, so list the peers the same way as for pnpm.

## expo-horizon-core

`release/horizon-core` is the upstream [software-mansion-labs/expo-horizon](https://github.com/software-mansion-labs/expo-horizon) `expo-horizon-core` release that `example/package.json` pins, with this repo's AGP 9 patches and the quest-flavor extras from `packages/expo-horizon-quest`. Every push to `main` runs `.github/workflows/release-branches.yml`, which rebuilds the branch from that pin and commits only when the rebuilt tree differs from the tip. The packed manifest records the upstream version in `expoPico.upstream`.

The branch was first cut from 57.0.3, whose only patch turns on `buildFeatures.buildConfig`: AGP 9 stopped generating `BuildConfig` by default, and the module reads `BuildConfig.META_HORIZON_APP_ID`.

`example/package.json` now pins `expo-horizon-core@58.0.1`, which turns on `buildConfig` itself. Its `android/build.gradle` still uses the `lintOptions` block that AGP 9 removed, so `scripts/patches/android/expo-horizon-core@58.0.1.patch` renames it to `lint`. The example's postinstall and `scripts/build-release-branches.mjs` apply that same file through `scripts/lib/android-patches.cjs`, so the next `release/horizon-core` cut from 58.0.1 ships with `lint`. The release build fails if `lintOptions` is still there after patching. The first push to `main` that carries the 58.0.1 pin moves the branch from 57.0.3 to 58.0.1. To stay on 57.0.3, pin the last 57.0.3 release commit SHA (see [Pinning a commit](#pinning-a-commit)).

## Native code

The Android Kotlin/C++ sources compile inside your app's normal Gradle build,
as with any native module. Generated Nitro bindings are already included.
Config plugins declare their runtime dependencies, including
`@expo/config-plugins`, so they also resolve with isolated pnpm installations.

`@expo-pico/core` carries its Eskiu runtime at `android/eskiu-runtime/`, together
with the release-built ARM64 object and its provenance. CMake uses that
packaged object in consuming apps. You do not install `eskiuc`, copy a vendor
directory, or rebuild an AAR when reinstalling the package or regenerating
`android/`. The source checkout retains its pinned compiler path for people
changing the Eskiu implementation; that compilation belongs to package
development and the release workflow.

PICO Platform Services are separate Maven dependencies selected by the config
plugin and resolved during Gradle builds. They do not need local AAR files.
Viro's immersive engine is a separate dependency: install a Viro release with
its matching native artifacts when adding a 3D renderer. A missing native
implementation is not repaired by supplying an unrelated SDK archive.

Doctor and prebuild check that an installed Viro package contains both Android
AARs and reject Git LFS pointers in their place. Releases with
`android/native-artifacts.json` also have their renderer and bridge hashes
checked. A damaged installation calls for reinstalling the complete pinned
package; normal app builds reuse its native libraries.

### Start a new app

```bash
npx create-expo-app@latest my-pico-app --template https://github.com/mikevocalz/expo-pico/tree/release%2Ftemplate
cd my-pico-app
npm run doctor
npm run pico
```

The `%2F` keeps `release/template` together as the branch name in Expo's
GitHub-template URL parser. The released template retains its app scripts and
development dependencies. It starts as a native React Native panel for PICO 4
and PICO 4 Ultra. Add Viro and a registered `PICO_APP_ID` for OS 5 immersive
launches; choose `pico-swan` explicitly for PICO OS 6 hardware.

### Validate a release as an app consumer

```bash
node scripts/smoke-release-consumer.mjs --releases /tmp/expo-pico-release
node scripts/smoke-release-consumer.mjs --releases /tmp/expo-pico-release --package-manager pnpm --assemble
```

The check creates a separate app, packs and installs the staged packages with
install scripts disabled, loads a dynamic Expo config through the shipped
doctor, runs two clean prebuilds, and exports the Android JavaScript bundle.
The `--assemble` path builds the PICO APK
without an Eskiu compiler or manually supplied AARs. CI runs the consumer build
on a fresh runner after the producer uploads its staged packages.

## Preview a release locally

```bash
yarn install --frozen-lockfile
yarn build
bash scripts/install-eskiuc.sh
node scripts/build-release-branches.mjs --out /tmp/expo-pico-release
```

Without `--push` the script stages each package under the `--out` directory and prints which branches would get a new commit. To try a staged package in an app, install it by path, for example `"@expo-pico/core": "file:/tmp/expo-pico-release/core"`.
