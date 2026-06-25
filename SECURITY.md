# Security policy

## Reporting a vulnerability

The `expo-pico-*` package family touches build-time Android project mutation, native manifest / Gradle writes, and runtime bridges into the PICO Platform SDK. Issues that could cause a consumer app to leak secrets, ship insecure manifest entries, or mis-authenticate against PICO Platform services are treated as security-relevant.

### How to report

**Do not file public GitHub issues for security vulnerabilities.** Instead:

- Open a private security advisory via GitHub:
  https://github.com/mikevocalz/expo-pico/security/advisories/new
- Or email the maintainer directly if your report contains information that shouldn't transit GitHub infrastructure.

Include:

- The package name(s) and version(s) affected.
- The attack surface (plugin config mutation, runtime bridge, credential handling, etc.).
- Reproduction steps. A minimal failing `app.config.ts` + command line is ideal.
- The Expo SDK version and React Native version of the consuming app.
- Your disclosure timeline expectations.

### Response commitment

Within three business days of receiving a report we will:

1. Acknowledge the report.
2. Confirm whether the issue is in scope.
3. Propose a coordinated disclosure timeline (default: 90 days, negotiable).

### What's in scope

- Plugin mutations that emit insecure manifest entries, leak secrets to disk, or bypass consumer-configured restrictions (`disabled`, `xrMode: 'mobile'`, etc.).
- Runtime bridge methods that round-trip credentials to / from the PICO Platform SDK in an unsafe way.
- `expo-pico-doctor` CLI vulnerabilities (path traversal, config-loading RCE, etc.).
- Build-time scripts (`download-demo-model.js`, `test:pack`, any postinstall hook) that could be exploited to run arbitrary code during install.

### What's out of scope

- Issues in upstream Expo / React Native / Three.js / PICO SDK code. Please report those to their respective maintainers.
- Issues in the PICO Platform Service SDK binary. That SDK is not distributed from this repo.
- Lint warnings, style issues, best-practice concerns, and feature requests. Use regular GitHub issues for those.
- Social-engineering risks (phishing, typosquat packages). Those are platform-level concerns; the npm registry team handles typosquats.

## Supply-chain hygiene

- The published packages use [npm provenance attestation](https://docs.npmjs.com/generating-provenance-statements).
- The `example/scripts/download-demo-model.js` postinstall script is the only build-time network fetch we ship. It:
  - Hits a pinned Khronos commit SHA (not a mutable branch head).
  - Validates the `glTF` magic bytes before writing to disk.
  - Is skippable via `EXPO_PICO_SKIP_DEMO_MODEL=1`.
  - Never touches any file outside `example/assets/models/`.
- No sibling package ships native binaries. PICO Platform SDK AARs, when used, are supplied by the consumer.

## Credential handling

The `platformService` plugin options (`picoAppId`, `picoAppKey`, `picoMerchantId`, `picoPayKey`, their `_foreign` siblings) are written into the Android project via:

- `strings.xml` resources (survive an APK rebuild).
- `gradle.properties` (used to propagate into library module BuildConfig fields).
- BuildConfig fields on the core library.

None of these are encrypted at rest. Consumers **must not** hard-code credentials in a committed `app.config.ts`; the documented pattern ([docs/EAS.md §2](./docs/EAS.md#2-secrets)) reads from `process.env` and stores values as EAS Secrets or equivalent. `expo-pico-doctor` surfaces an `identity.missing` diagnostic when secrets aren't set at prebuild time.

## Known limitations

- The plugin does not enforce key-format validation beyond non-empty-string. A consumer can set `picoAppKey: 'not-a-real-key'`; the plugin writes it as-is. Key validation happens at PICO Platform SDK runtime, not at plugin time.
- The reflection probe (`PicoPlatformSdkDetector`) relies on the PICO Platform SDK AAR being honest about its class names. A malicious fork of the SDK could present the same class names and pass the probe; the plugin doesn't verify signatures.
