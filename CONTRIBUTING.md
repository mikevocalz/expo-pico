# Contributing

This repo ships Expo-native packages for PICO OS. Changes are not accepted on API shape alone; they must preserve the current contract philosophy and public package boundaries.

## Ground Rules

- keep public package boundaries intact
- use `@expo-pico/platform-service-common` as the only shared runtime helper layer
- preserve typed error normalization and safe fallback behavior
- do not claim service support without validation evidence
- do not weaken `NOT_IMPLEMENTED`, `SERVICE_UNAVAILABLE`, or `NOT_SUPPORTED` semantics

## Local Verification

Run these before opening a PR:

```sh
yarn prettier:check
yarn lint
yarn typecheck
yarn test
yarn build
yarn test:pack
yarn example:prebuild:android
yarn example:assemble:mobile
yarn example:assemble:pico
```

## Validation Work

If your change affects native behavior, the example app is the proving harness.

- update the relevant checklist in `docs/validation/package-checklists.md`
- record pass, block, or defer status
- include device model, OS version, and build variant in the PR description

## Bug Reports

Include:

- package name and version
- Expo SDK and React Native version
- build variant (`mobile`, `pico`, or `dual`)
- device model or emulator
- whether the issue happened on real hardware
- whether platform services were provisioned
- normalized error code and last harness result if available
