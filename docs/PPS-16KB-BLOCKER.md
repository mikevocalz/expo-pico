# PPS ships 4KB-aligned loaders, and PICO needs 16KB

PICO requires 16KB ELF page alignment. Two libraries in a PICO build do not have
it, both from PICO's own Platform Service SDK. They cannot be fixed here.

## What fails

```
FAIL  app-pico-debug.apk!lib/arm64-v8a/libpxrplatformloader.so:   PT_LOAD alignment 0x1000 < 0x4000
FAIL  app-pico-debug.apk!lib/arm64-v8a/libpxrplatformloader4j.so: PT_LOAD alignment 0x1000 < 0x4000
```

Every other library in the APK passes at `0x4000`: 48 of 50. Both offenders are
`0x1000`, which is 4KB. A `PT_LOAD` segment aligned below the device page size
fails at `dlopen`, so this is a crash rather than a degradation.

## Where they come from

`com.pico.pps:pps_platform_java_base:0.0.1-rc.0`, resolved from
`https://artifact.bytedance.com/repository/Volcengine/`. Confirmed by locating
the file in the Gradle transform cache:

```
~/.gradle/caches/9.3.1/transforms/<hash>/transformed/
  pps_platform_java_base-0.0.1-rc.0/jni/arm64-v8a/libpxrplatformloader.so
```

It arrives transitively. `ppsArtifacts.ts` pins only `platform-service-*` and
`pps_sdk_base` to `PPS_VERSION`, and its comment explains why the pin is narrow:
`pps_platform_java_base` sits on its own version line and pinning the group would
force it to a version that was never published.

## Why a version bump does not fix it

`0.0.1-rc.0` is the only version of `pps_platform_java_base` ever published.
`maven-metadata.xml` for that artifact lists exactly one entry, checked against
both the Bytedance repo and `developer.pico-interactive.com/maven`.

The rest of the group has moved on — `pps_sdk_base` and `platform-service-*`
publish up to `1.1.2`, against the `1.0.0` pinned here — but neither of those
artifacts ships a `.so` at all. `pps_sdk_base-1.1.2.aar` contains only
`classes.jar`, `AndroidManifest.xml`, `R.txt` and `proguard.txt`. Upgrading the
pinned modules changes nothing about the alignment, because the loaders are not
in them.

## Why it cannot be dropped

The example imports eleven PPS-backed packages: account, achievements, iap,
leaderboards, notifications, rooms, rtc, social, spatial, storage, subscription.
This is a used surface, not dead weight.

## What has to happen

PICO republishes `pps_platform_java_base` built with
`-Wl,-z,max-page-size=16384`. Until then the PPS surface is not shippable to a
16KB-page PICO device, and no change in this repository alters that.

Report it against the Platform Service SDK, quoting the two library names, the
artifact coordinate and version, and the measured `PT_LOAD` alignment above.

## In the meantime

`example:assemble:pico` runs the check with both loaders named:

```
--allow libpxrplatformloader.so --allow libpxrplatformloader4j.so
```

Failing the build on them would block every build here on a fix only PICO can
publish, which is not a trade worth making. Naming them keeps the check on for
everything else: a library this repo does build that regresses to 4KB still
fails, because the allowance covers exactly two basenames.

The allowance also reports itself when it stops being needed. An `--allow` that
matches no under-aligned library is a failure, so the day PICO republishes
`pps_platform_java_base` with aligned loaders, the next build fails with
`unused --allow` and names the entry to delete. Nobody has to remember to check.

Do not add to this list casually. Two entries with a written reason and an
upstream owner is a deferral; a growing list is how a check stops meaning
anything.
