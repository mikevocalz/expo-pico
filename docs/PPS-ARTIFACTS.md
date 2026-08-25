# One copy of the PICO SDK, however many packages you install

Installing `@expo-pico/account`, `@expo-pico/social`, `@expo-pico/iap` and
`@expo-pico/rooms` in the same app must not put four copies of the PICO
Platform Service SDK on the Android classpath. This is how that is arranged,
and what still needs a human decision.

## The rule

**`expo-pico-core` declares every `com.pico.pps` coordinate, in the app
module, once. No other package in the family declares one.**

That is checkable, not aspirational:

```console
$ rg 'com\.pico\.pps' packages/*/android/build.gradle
$ # (no matches — only expo-pico-core's config plugin emits these)
```

The sibling packages reach the SDK through `implementation
project(':expo-pico-core')`, so adding one to an app adds a project
dependency, never a second Maven coordinate. Nothing about installing more
of them can produce a duplicate declaration.

## What is actually on the classpath

Resolved from the public Volcengine Maven with a real Gradle run — 48
artifacts for all eleven services:

| Artifact | Version | Notes |
| --- | --- | --- |
| `com.pico.pps:platform-service-{achievement,auth,compliance,entitlement,friend,iap,leaderboard,push,social,speech,sport}` | 1.0.0 | The services |
| `com.pico.pps:pps_sdk_base` | 1.0.0 | **Depended on by all eleven** |
| `com.pico.pps:pps_platform_java_base` | 0.0.1-rc.0 | `achievement`, `leaderboard` only |
| `com.pico.pps:matrix_psf_api` | 1.0.0 | `base`, `social` |
| `com.pico.pps:sdk.lib.annotations` | 0.0.1-alpha.0 | Annotations |
| `com.pico.pps:coreservice.library` | 2.1.0-alpha.13 | Transitive |
| `com.squareup.wire:wire-runtime` | 2.3.0-RC1 | Payloads are Wire protobuf |
| `io.reactivex.rxjava2:rxjava` / `rxandroid` | 2.2.6 / 2.1.1 | `Task.runTask` takes an RxJava `Maybe` |

A duplicate-class scan across all 48 resolved artifacts finds **no
collisions**. Declaring all eleven services together is safe; the SDK's own
graph is internally consistent.

Reproduce it:

```bash
mkdir pps && cd pps
cat > settings.gradle <<'EOF'
rootProject.name = 'pps'
EOF
cat > build.gradle <<'EOF'
plugins { id 'java-library' }
repositories {
    maven { url "https://artifact.bytedance.com/repository/Volcengine/" }
    google(); mavenCentral()
}
configurations { pps }
dependencies {
    ['auth','iap','friend','social','achievement','leaderboard','push',
     'entitlement','compliance','sport','speech'].each {
        pps "com.pico.pps:platform-service-${it}:1.0.0"
    }
}
tasks.register('copyAll', Copy) { from configurations.pps; into 'out' }
EOF
gradle -q copyAll && ls out
```

## The two things that *can* duplicate

Neither comes from adding `@expo-pico/*` packages. Both are guarded.

### 1. A vendored AAR shadowing the Maven copy

PICO's integration docs tell you to drop SDK AARs into
`android/app/libs/`, and the plugin emits a `fileTree` over that directory
for offline and air-gapped builds. Left unbounded, a
`platform-service-auth-1.0.0.aar` sitting there is packaged *alongside* the
Maven artifact, and the build dies on:

```
Duplicate class com.pico.pps.sdk.auth.ISignInClient found in modules
  jetified-platform-service-auth-1.0.0 and platform-service-auth-1.0.0
```

The generated block excludes every filename Maven already supplies:

```gradle
dependencies {
    implementation fileTree(
        dir: 'libs',
        include: ['*.aar', '*.jar'],
        exclude: ['platform-service-*.aar', 'platform-service-*.jar',
                  'pps_sdk_base*.aar', 'pps_sdk_base*.jar',
                  'pps_platform_java_base*.aar', 'matrix_psf_api*.aar',
                  'coreservice.library*.aar', 'sdk.lib.annotations*.jar']
    )
}
```

Verified with a Gradle run over a `libs/` holding
`platform-service-auth-1.0.0.aar`, `sdk.lib.annotations-0.0.1-alpha.0.jar`
and an unrelated `my-vendor-lib.jar`: unbounded, all three land on the
classpath; bounded, only `my-vendor-lib.jar` does. Genuinely vendored
libraries still work — only PICO's own artifacts are filtered.

### 2. Version skew dragging `pps_sdk_base` out from under the services

Every service depends on `com.pico.pps:pps_sdk_base`. The repo publishes
newer lines than the one this release pins — `1.0.1-alpha.15` was the
`<release>` in `maven-metadata.xml` at the time of writing. Gradle's default
conflict resolution picks the highest version it sees, so **one** foreign
declaration is enough to move the shared base while leaving every other
service behind:

```
# One hand-written `platform-service-auth:1.0.1-alpha.15`, no pin:
com.pico.pps:platform-service-auth:1.0.1-alpha.15
com.pico.pps:platform-service-friend:1.0.0
com.pico.pps:platform-service-iap:1.0.0
com.pico.pps:platform-service-social:1.0.0
com.pico.pps:pps_sdk_base:1.0.1-alpha.15   <-- three services now run
                                               against a base they were
                                               not compiled against
```

Two guards, both generated:

- **`constraints`** in the app module, covering all eleven services and
  `pps_sdk_base` — including services the app does not use, so a later
  addition lands on the pinned version.
- **`resolutionStrategy.eachDependency`** under `allprojects` in the
  project-level `build.gradle`, so an autolinked React Native library that
  requests a PPS coordinate resolves the same way.

With the pin, the run above resolves everything to `1.0.0`.

The pin is deliberately narrow — `platform-service-*` and `pps_sdk_base`
only. The group also carries `pps_platform_java_base` (0.0.1-rc.0),
`sdk.lib.annotations` (0.0.1-alpha.0) and `coreservice.library`
(2.1.0-alpha.13), none of which have a 1.0.0 release; forcing the whole
group would ask Gradle for versions that were never published.

## Which services get declared

Derived from the packages actually installed, de-duplicated:

| Package | Services |
| --- | --- |
| `@expo-pico/account` | `auth` |
| `@expo-pico/achievements` | `achievement` |
| `@expo-pico/iap` | `iap` |
| `@expo-pico/leaderboards` | `leaderboard` |
| `@expo-pico/notifications` | `push` |
| `@expo-pico/rooms` | `friend` |
| `@expo-pico/social` | `social`, `friend` |
| `@expo-pico/subscription` | `iap` |
| `@expo-pico/app-kit`, `@expo-pico/core`, `@expo-pico/rtc`, `@expo-pico/spatial`, `@expo-pico/storage` | none |

`social` and `rooms` both need `friend`; installing both emits one
`friend` line. `iap` and `subscription` both need `iap`; same.
`rtc` and `storage` map to nothing because no such artifact exists on the
repo — see [PPS-WIRING-GAPS.md](./PPS-WIRING-GAPS.md).

If detection finds nothing — a resolver that cannot see `node_modules`, or
only `@expo-pico/core` installed — the plugin falls back to all eleven. A
detection miss becomes a slightly larger APK, never a
`ClassNotFoundException`.

Override it when you need a service no package wraps yet:

```ts
// app.config.ts
['@expo-pico/core', {
  platformService: {
    picoAppId: process.env.PICO_APP_ID,
    // entitlement, compliance, sport and speech have no @expo-pico
    // package. Name them here to put them on the classpath.
    services: ['auth', 'iap', 'entitlement'],
  },
}]
```

## Checking a real project

```bash
npx expo-pico-doctor
```

Three checks cover this file:

| Check | Severity | Fires when |
| --- | --- | --- |
| `pps-artifact-shadowed-by-libs` | warning | `android/app/libs` holds a file Maven already supplies. Excluded from the build, so it is inert — but it is not doing what its presence suggests. |
| `pps-block-injected-twice` | error | The plugin's dependency block appears more than once in `app/build.gradle`. Every artifact is declared twice. |
| `pps-coordinate-version-skew` | warning | A `com.pico.pps` coordinate is requested at an unpinned version. The pin overrides it, so the version written there has no effect. |

## Still open

`implementation project(':expo-pico-core')` in the sibling packages
currently resolves through Expo Modules autolinking, which generates the
`include ':expo-pico-core'` line in the app's `settings.gradle`. **Nitro
does not provide that.** The Nitro migration has to settle how siblings
reach core before the Kotlin lands — see
[NITRO-ANDROID.md](./NITRO-ANDROID.md). It is a resolution failure, not a
duplication one, but it is the same seam.
