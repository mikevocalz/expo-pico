<!--
  Thanks for contributing to expo-pico!

  Before submitting: please confirm your PR meets the contract described
  in CONTRIBUTING.md and run the local verification block.
-->

## Summary

<!-- 1–3 sentences. What does this PR change and why? -->

## Affected packages

<!-- Check every package this PR touches. -->

- [ ] `expo-pico-core`
- [ ] `expo-pico-spatial`
- [ ] `expo-pico-account`
- [ ] `expo-pico-iap`
- [ ] `expo-pico-notifications`
- [ ] `expo-pico-rtc`
- [ ] `expo-pico-rooms`
- [ ] `expo-pico-subscription`
- [ ] `expo-pico-storage`
- [ ] `expo-pico-social`
- [ ] `expo-pico-achievements`
- [ ] `expo-pico-leaderboards`
- [ ] `@expo-pico/platform-service-common` (internal)
- [ ] example app
- [ ] docs / governance only

## Change type

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (requires a major-bump changeset)
- [ ] Docs / governance
- [ ] CI / release infrastructure
- [ ] Internal refactor (no behavior change)

## Changeset

- [ ] I added a changeset via `yarn changeset` that covers the affected packages with the correct bump level.
- [ ] OR — this PR does not need a changeset (docs-only, CI-only, internal-only) and I have confirmed CI's changeset advisory is informational in my case.

## Verification

<!-- Paste the output or check each step. See CONTRIBUTING.md for the full block. -->

- [ ] `yarn prettier:check`
- [ ] `yarn lint`
- [ ] `yarn typecheck`
- [ ] `yarn test`
- [ ] `yarn build`
- [ ] `yarn test:pack`
- [ ] `yarn example:prebuild:android` (if this PR touches plugin / manifest code)
- [ ] `yarn example:assemble:mobile` (if this PR touches plugin / manifest code)
- [ ] `yarn example:assemble:pico` (if this PR touches plugin / manifest code)
- [ ] `npx expo-pico-doctor --fail-on-warning --project example` (if this PR touches diagnostics)

## Device / hardware evidence (if applicable)

<!--
  If your PR affects native behavior, include:
  - Device model + OS version (e.g. "PICO 4 Ultra, PICO OS 6.1.2")
  - Build variant (`picoDebug` / `mobileDebug` / `dualDebug`)
  - Whether platform identity was provisioned
  - Screenshots / logs demonstrating the change
-->

## Documentation updates

- [ ] Updated the relevant per-package README if the public API changed.
- [ ] Updated ARCHITECTURE.md if a new plugin surface / design decision landed.
- [ ] Updated QUICKSTART / EAS / PRODUCTION-READINESS if the consumer flow changed.

## Notes for reviewers

<!-- Anything non-obvious: design alternatives considered, rollback plan,
     follow-ups deferred, related PRs, etc. -->
