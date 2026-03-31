# CI and Release Gates

## Required for Every PR

- `yarn prettier:check`
- `yarn lint`
- `yarn typecheck`
- `yarn test`
- `yarn build`
- `yarn test:pack`
- `yarn example:prebuild:android`
- `yarn example:assemble:mobile`
- `yarn example:assemble:pico`

## Required for Prerelease

- all PR gates
- changeset validation
- docs reviewed for status/support accuracy
- latest Phase 6 evidence attached for packages moving maturity

## Required for Stable Release

- all prerelease gates
- real hardware evidence for each package entering `latest`
- two-device evidence for `expo-pico-rtc`, `expo-pico-rooms`, and `expo-pico-social`
- blocker list reviewed and signed off

## Manual Gates

- push delivery proof
- storefront purchase and subscription verification
- multi-user service proof
- final package maturity approval
