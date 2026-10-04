# Installing expo-pico from GitHub

expo-pico is not on npm. Every package installs from a branch of this repo instead, the same way the ViroReact fork does.

Each push to `main` runs [`.github/workflows/release-branches.yml`](../.github/workflows/release-branches.yml). It builds the workspace, runs `npm pack` on each package, and commits the packed contents to that package's own `release/<name>` branch. The package root is the branch root, with `build/`, `plugin/build/`, `cli/build/` and `android/` already in place. The release manifests have no `scripts`, so nothing builds or runs at install time. pnpm needs no `allowBuilds` entry for these packages.

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

`release/horizon-core` is the upstream [software-mansion-labs/expo-horizon](https://github.com/software-mansion-labs/expo-horizon) `expo-horizon-core` at the version `example/package.json` pins (57.0.2 today), with one patch: `android/build.gradle` turns on `buildFeatures.buildConfig`. AGP 9 stopped generating `BuildConfig` by default, and the module reads `BuildConfig.META_HORIZON_APP_ID`. The packed manifest records the upstream version in `expoPico.upstream`.

## Native code

The Android sources ship as source and compile inside your app's Gradle build, as with any Expo module. `@expo-pico/core` carries its Eskiu runtime at `android/eskiu-runtime/`, because `packages/internal` does not exist outside this repo. Its `CMakeLists.txt` looks there first and falls back to the monorepo path.

## Preview a release locally

```bash
yarn install --frozen-lockfile
yarn build
node scripts/build-release-branches.mjs --out /tmp/expo-pico-release
```

Without `--push` the script stages each package under the `--out` directory and prints which branches would get a new commit. To try a staged package in an app, install it by path, for example `"@expo-pico/core": "file:/tmp/expo-pico-release/core"`.
