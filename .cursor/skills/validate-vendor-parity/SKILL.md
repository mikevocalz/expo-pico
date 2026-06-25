---
name: validate-vendor-parity
description: Verify that the vendored expo-horizon copy in .vendor/expo-horizon/ matches upstream software-mansion-labs/expo-horizon main. Use when checking parity after pulling upstream changes, before bumping the vendored version, or when investigating a divergence between our copy and upstream Horizon's behaviour.
disable-model-invocation: true
---

# Validate Vendor Parity

`.vendor/expo-horizon/` is a checked-in copy of the
[`software-mansion-labs/expo-horizon`](https://github.com/software-mansion-labs/expo-horizon)
repo that decax9 (and other consumers) install Meta Quest support from via
`expo-horizon-core: file:.../expo-pico/.vendor/expo-horizon/expo-horizon-core`.

Because consumers depend on the vendored path directly — there is no
intermediate npm publish — every change we accept upstream silently ships
into consumers on the next prebuild. This skill keeps that fork honest:

- Native code under `expo-horizon-core/android/src/main` should equal upstream
  unless we've taken an intentional patch.
- Native code under `expo-horizon-core/android/src/quest` is Horizon-only and
  may diverge; review separately.
- iOS code (under `expo-horizon-core/ios/`) is mostly unused in our PICO
  builds but should still match upstream so Quest consumers stay current.
- TypeScript `src/` may differ but unexpected diffs should be flagged.

## What to compare

| Local                                              | Upstream (`software-mansion-labs/expo-horizon`)  |
| -------------------------------------------------- | ------------------------------------------------ |
| `.vendor/expo-horizon/expo-horizon-core`           | `expo-horizon-core`                              |
| `.vendor/expo-horizon/expo-horizon-location`      | `expo-horizon-location`                          |
| `.vendor/expo-horizon/expo-horizon-notifications` | `expo-horizon-notifications`                     |

Ignored: `build/`, `package.json`, lockfiles, `README`, `CHANGELOG`, `plugin/`,
`example/`, `.github/`.

## Steps

1. Fetch the latest upstream into a sibling clone (or reuse one):

```bash
git -C ~/expo-horizon-upstream fetch origin main && git -C ~/expo-horizon-upstream checkout origin/main
```

2. Run the validator. It rsyncs our vendored copy into the upstream checkout
   so `git diff` shows exactly what differs. Nothing in this repo is
   touched.

```bash
.cursor/skills/validate-vendor-parity/scripts/validate-parity.sh ~/expo-horizon-upstream
```

3. Read the output:
   - **Native section (Android `src/main` + iOS):** empty = PASS. Any hunk is
     either an intentional Horizon-only patch that should be moved to
     `src/quest`, or accidental drift to fix.
   - **TypeScript `src/` section:** flag only unexpected differences;
     intentional Horizon-only changes are fine.

4. Restore the upstream checkout when done:

```bash
.cursor/skills/validate-vendor-parity/scripts/validate-parity.sh ~/expo-horizon-upstream --restore
```

This skill mirrors `expo-horizon-core`'s own
[`validate-upstream-parity`](https://github.com/software-mansion-labs/expo-horizon/blob/main/.cursor/skills/validate-upstream-parity/SKILL.md)
skill but inverts the direction: our copy is the fork, upstream Horizon is
the source of truth.
