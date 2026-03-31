# Example Validation Harness

The example app is the Phase 6 proving harness for the monorepo.

## Goals

- expose each package behind explicit user actions
- show current environment and provisioning assumptions
- capture last result, last error code, and event traffic per package
- export a session report for validation evidence

## Sections

- `Overview`: build/runtime snapshot, environment flags, and service availability
- `Core / Spatial`: runtime detection and spatial snapshot
- `Account`: identity and account-link probes plus deferred seams
- `Commerce`: IAP, subscription, and notification permission/token flows
- `Comms`: RTC and rooms actions, including event feeds
- `Social / Game`: storage, social, achievements, and leaderboards
- `Evidence`: session report, pass/block/defer counts, export action

## Result Panes

Each package card should display:

- current maturity
- required validation environment tags
- last result payload
- last normalized error code
- last updated timestamp
- event log where the package emits listeners

## Evidence Capture

For each validation run:

1. record build variant, app ID, device model, and OS version
2. run the targeted package actions
3. export the evidence report from the harness
4. attach screenshots or recordings for any user-facing dialog or OS flow
5. update `docs/validation/package-checklists.md` with pass, block, or defer state

## Guardrails

- do not treat emulator results as service proof
- do not mark a package as stable if the harness only proved `SERVICE_UNAVAILABLE` or `NOT_IMPLEMENTED`
- keep deterministic test data for SKUs, room IDs, achievement IDs, leaderboard IDs, and storage keys
