# Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) + three GitHub Actions workflows to publish the `expo-pico-*` package family to npm.

## Repo secrets required

One-time setup in GitHub → repo → Settings → Secrets and variables → Actions:

- `NPM_TOKEN` — an npm [automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) with publish scope on all `expo-pico-*` packages. Exposed to publish workflows as `NODE_AUTH_TOKEN`.

npm provenance attestation (`NPM_CONFIG_PROVENANCE=true` in the publish workflows) needs `id-token: write` permission on the workflow, which is already configured in `.github/workflows/prerelease.yml` and `.github/workflows/release.yml`.

## The release flow

Every published version has three touchpoints:

1. **A changeset file** under `.changeset/`. Written by whoever lands the feature. Describes what changed and at what bump level.
2. **The `Version Packages` PR** opened automatically by `.github/workflows/version-pr.yml` when commits land on `main` carrying unconsumed changesets. Consumes the `.changeset/*.md` files → bumps versions in every affected `package.json` → rolls CHANGELOGs.
3. **A publish workflow run** — either `release.yml` (stable) or `prerelease.yml` (alpha/beta/rc).

### Day-to-day

1. Make a code change on a feature branch.
2. Run `yarn changeset` (or `npx changeset`) and follow the prompts.
   - Select the packages that changed.
   - Select the bump level (patch/minor/major).
   - Write a concise summary — this becomes the CHANGELOG entry.
3. Commit the generated `.changeset/*.md` alongside the code change. CI will emit an advisory on the PR if no changeset was included.
4. Merge the PR to `main`.
5. A few minutes later, `version-pr.yml` opens (or updates) a "Version Packages" PR. Review the CHANGELOG diff, merge when ready.
6. Dispatch `release.yml` (GitHub Actions → Stable Release → Run workflow) to publish the bumped versions.

### Prerelease (alpha / beta / rc)

Use when you want consumers to `npm install expo-pico-core@alpha` without polluting the stable dist-tag.

1. One-time per prerelease cycle: on `main`, run `yarn changeset pre enter alpha` (or `beta` / `rc`) and commit the resulting `.changeset/pre.json`. This tells Changesets to suffix every subsequent version bump with `-alpha.N`.
2. Authors add normal changesets as usual (step 2 above).
3. The `Version Packages` PR will now bump versions to forms like `1.0.0-alpha.0`. Merge as usual.
4. Dispatch `prerelease.yml` (Actions → Prerelease Publish → Run workflow) and pick the channel. The published versions are dist-tagged `alpha` / `beta` / `rc` so `npm install expo-pico-core@latest` still serves the last stable version.
5. When the prerelease cycle is done: on `main`, run `yarn changeset pre exit` and commit. The next `Version Packages` PR will drop back to normal version numbers. Dispatch `release.yml` to publish the stable version.

## Lockstep versioning (`linked`)

`.changeset/config.json` configures every `expo-pico-*` package as `linked`. When one bumps, they all bump to the same version. Rationale:

- Siblings declare `peerDependencies: { "@expo-pico/core": ">=1.0.0" }`. Changesets cascades a peer-dep version change as a major bump on the consumer regardless of declared range width (hardcoded in `@changesets/assemble-release-plan`). Linked versioning makes that cascade visible and predictable rather than producing staggered major bumps across siblings.
- Consumers composing several sibling packages in one app always see matching versions, which avoids confusing error paths where a sibling's native module contract mismatches core's.

If you need to publish only one sibling without bumping the rest, remove it from `linked[0]` in `.changeset/config.json` on a feature branch. Revert before merge unless the break is permanent.

## Verifying before release

Run locally before dispatching a publish workflow:

```bash
yarn install --frozen-lockfile
yarn lint
yarn typecheck
yarn test
yarn build
yarn test:pack          # dry-run `npm pack` on each package, catches file[] mistakes
yarn changeset status   # shows what versions the next publish would emit
```

If you changed a package's `package.json` (added `files` entries, bumped an SDK peer range, etc.), run `yarn test:pack` to confirm the emitted tarball contains only the files you expect.

## Per-package tarball shape

Each sibling package's `files` array is tailored to its own layout:

| Package has         | Files entries                                                                          |
| ------------------- | -------------------------------------------------------------------------------------- |
| `android/`          | `android`                                                                              |
| `plugin/`           | `plugin/build`                                                                         |
| `app.plugin.js`     | `app.plugin.js`                                                                        |
| `expo-module.config.json` | `expo-module.config.json`                                                        |
| (all)               | `build`                                                                                |

npm always includes `package.json`, `README.md`, `CHANGELOG.md`, and `LICENSE`/`NOTICE` regardless of `files`. Nothing in `src/`, `plugin/src/`, `__tests__/`, or test configs reaches the registry.

## Rollback

If a published version is broken:

1. `npm unpublish` within 72 hours is possible but not recommended — dist-tag republishing is safer.
2. Revert the breaking commit on `main`.
3. Add a fresh changeset describing the revert.
4. Let the Version Packages PR produce the next patch release.
5. Once published, move the `latest` dist-tag if needed: `npm dist-tag add expo-pico-core@<good-version> latest`.

## Running `expo-pico-doctor` locally

`expo-pico-core` ships a CLI (`expo-pico-doctor`, bin entry in its `package.json`) that lints your Expo project's plugin config against the same seven diagnostic checks the prebuild pass emits. Useful before pushing to avoid surprise CI failures.

```bash
# From your Expo project root
npx expo-pico-doctor
```

- **TypeScript configs.** Doctor does not ship an in-process TS transpiler. If your project uses `app.config.ts` and `@expo/config`'s default loader doesn't surface the plugins array on your Expo version, pre-resolve it once:
  ```bash
  # In your project root
  npx expo config --type prebuild --json > /tmp/resolved.json
  # Wrap in { "expo": ... } if doctor reports "plugin not found"
  node -e 'const c=require("/tmp/resolved.json");require("fs").writeFileSync("/tmp/app.config.json",JSON.stringify({expo:c}))'
  npx expo-pico-doctor --project /tmp
  ```
- **Pre-commit hook.** Add to `.git/hooks/pre-commit` or your Husky config: `npx expo-pico-doctor --fail-on-warning`. Exits 1 on warnings, so a clean commit requires a clean config.
- **CI gate.** The repo's own `.github/workflows/ci.yml` runs a self-smoke of the doctor against a minimal fixture on every PR. A broken CLI can't ship from green CI.

## Shipping an app (not a package)

This doc covers releasing the `expo-pico-*` **packages** themselves. If you are shipping an **app** that consumes these packages to the PICO Store, see:

- [docs/EAS.md](./docs/EAS.md) — EAS Build + PICO submission flow.
- [docs/PRODUCTION-READINESS.md](./docs/PRODUCTION-READINESS.md) — pre-ship checklist.

## Questions

Open an issue at https://github.com/mikevocalz/expo-pico/issues.
