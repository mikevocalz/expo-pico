# Prerelease Checklist

Before publishing any prerelease train:

- root README package table matches actual maturity and support claims
- package READMEs describe implemented, provisional, and deferred surfaces accurately
- `docs/validation/phase-6-matrix.md` is current
- `docs/validation/package-checklists.md` shows latest pass/block/defer state
- lint, typecheck, build, test, and pack smoke are green
- example app compiles for `mobileDebug` and `picoDebug`
- any package moving above `experimental` has fresh device evidence
- placeholder repo metadata is either fixed or explicitly called out as a blocker
- changesets are present and scoped to the intended packages

## Dist-Tag Rules

- `alpha`: default for new public prereleases
- `beta`: only after one-device proof and docs hardening
- `rc`: only after blocker review
- `latest`: only for packages that have cleared stable-release gates
