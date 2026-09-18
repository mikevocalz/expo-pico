# PICO OS terminates the app at launch without a registered app id

Observed on hardware 2026-09-18: PICO 4 Ultra (model A9210), Android 14,
SDK 34. The build under test was the paired fork APK, sha256
`0dd44afdbc3906c0a54092a5d0d19d921f4ed2ec91c40968ba63504e8552b9f8`, installed
after uninstalling the previous copy.

## What happens

`am start -n com.example.expopico/.MainActivity` brings up the activity, then
PICO's entitlement service puts a system dialog over it:

```
com.bytedance.pico.matrix.entitlement.ui.EntitlementDialogWithConfirmBtn
  "expo-pico-example"
  "No entitlement info in the local cache, make sure you are connected to the Internet"
  [ Confirm ]
```

The app is then removed. From one `dispatchRunningAppState` to the next, about
40 ms apart, `com.example.expopico` disappears from the running list while the
dialog stays:

```
... {"clientId":113, ... "cmp":"...EntitlementDialogWithConfirmBtn"},
    {"clientId":112, ... "pkg":"com.example.expopico","cmp":"...MainActivity"}]

... {"clientId":113, ... "cmp":"...EntitlementDialogWithConfirmBtn"}]
```

Afterwards `pidof com.example.expopico` returns nothing and the foreground is
`com.pvr.vrshell`. There is no `FATAL EXCEPTION` and no `AndroidRuntime` entry —
the process is taken down by the OS, not by a crash in the app.

Reproduced twice, including once where the dialog was dismissed with the
controller: Confirm closes the dialog and the app does not come back.

## Why the dialog cannot be dismissed over adb

It is an XRShell system panel on its own display, not part of the app's window.
`dumpsys window` reports `mCurrentFocus=null`, so `input tap` and
`input keyevent` do not reach it. A tap sent at the button's coordinates lands
on the app surface underneath. Only the headset controller can press it, and
pressing it does not let the app run.

## What `entitlementCheck: false` actually does

Nothing that affects this. The plugin writes the
`pvr.app.entitlement.check` meta-data only when the option is true
(`withPicoAndroidManifest.ts:274-278`); with it false the key is simply absent,
confirmed absent from the built manifest. PICO OS runs its own check regardless.
The option controls whether the app declares a check, not whether the OS
performs one.

## What unblocks it

A `picoAppId` registered in the PICO Developer Console, supplied at build time.
The plugin already warns about this during prebuild:

> xrMode 'pico-os5' is an immersive build but picoAppId is empty. Every PPS call
> will fail at runtime with PICO error 100008 "appkey is empty".

That warning understates it. The consequence is not only that PPS calls fail —
without the id the OS ends the process before any app code runs, so nothing is
testable on device. Export `PICO_APP_ID` from `.env.local` before prebuild and
rebuild.

## Effect on the device runbook

Every case in `docs/pico/g5-runbook.md` is blocked behind this. None of them can
start, including the ones that have nothing to do with platform services: the
interaction profile read, the plane-detection capability transitions, scene
push and pop, `onExitViro`, suspend and resume, recentre, and passthrough.
