# Handoff — PICO bridge release gates

State as of 2026-09-18. Everything below was verified by running it, not read
off a previous note. Where something is an inference it says so.

## Branch heads

| Repo | Branch | Head |
| --- | --- | --- |
| mikevocalz/virocore | `codex/pico-cli-bridge` | `6415c165` |
| mikevocalz/viro | `codex/pico-cli-bridge` | `035f8f8d` |
| mikevocalz/expo-pico | `codex/pico-cli-bridge` | `827ba108` |

All three synced with their remotes, no uncommitted work. Suites green: viro 26
suites / 226 tests, expo-pico 24 suites / 339 tests, alignment 8 tests in each
of virocore and expo-pico.

## Gate status

| Gate | Status | Note |
| --- | --- | --- |
| G0 inventory, pins, drift | PASS | viro#526 drifted; fork integrated `b893648`, head is now merge `5bddce6` |
| G1 AAR provenance, 16KB | PASS | |
| G1.3 packaging | PASS | was blocked by an exit code, not missing output |
| G1.4 APK | PASS | `0dd44afd…`, 48 of 50 libraries aligned |
| G2 iOS target invariant | PASS | converged on 15.1 |
| G3 device framework | PASS | ViroKit rebuilt at `minos 15.1` |
| G3 simulator | FAIL | terminal, see below |
| G3 WASM | PASS | `viro-web.wasm` 3.1M, emcc 6.0.3 |
| G4 native suites | PASS | |
| G4 web suites | BLOCKED | renderer unpublished |
| G5 device matrix | PARTIAL | first real results in `viro/docs/pico/g5-results.md` |
| G6 docs and reviews | PASS | items 5 and 6 need G5 captures |
| G7 evidence ledger | PASS | `docs/VIRO-PICO-RELEASE-EVIDENCE.md` |

## Pick this up first

**The panel loses its controls after exiting XR.** Hardware back exits cleanly
and the process survives, but the returned panel renders only the title and
description — no chips, no Enter XR button, no rows. The screen is settled, not
mid-render, and it reproduced on both exits. There is no way back into XR
without restarting the app, so every remaining runbook case is blocked behind
it. Start in `viro` `components/Studio/` and the example's `HomeScreen`; the
`actions` column stops rendering while `hero` still does.

Everything else in the device matrix is ready to run once that is fixed.

## Device session, how to resume

The headset is currently unplugged. Reconnect over USB and:

```sh
adb logcat -G 16M          # the default buffer rotates fast enough to lose XR init
adb logcat -c
adb install -r <apk>       # uninstall first; never read a screen against an unknown binary
```

Three things learned the hard way:

- **Injected taps do not fire the panel's controls.** They reach the panel's
  virtual display — a tap navigated to Diagnostics — but the Enter XR button
  never responded across three attempts, and a controller press worked first
  time. Drive with the controller; use adb for capture only.
- **The panel is on its own display.** Find it with
  `dumpsys window displays` and target input with `input -d <id>`. Display 0 is
  not it.
- **`uiautomator dump` crashes** against argent's devtools with
  `UiAutomationService already registered`. It kills the dump process, not the
  app. Use argent `describe`.

## What the device settled

**Entitlement.** PICO OS ends the process at launch when it cannot verify the
app — the activity starts, a system dialog appears, and about 40 ms later the
package is gone from the running list with no crash in logcat. The dialog is an
XRShell panel on its own display, so adb cannot dismiss it. A signed-in PICO
account on the headset is what cleared it. An app id borrowed from another
package does not work: dialogs dropped from 37 to 4 and the process survived
about eight seconds, then PICO killed it anyway. Full trace in
`docs/PICO-ENTITLEMENT-BLOCKS-LAUNCH.md`.

**Interaction profile, K01, PASS.** Both hands bound to
`/interaction_profiles/bytedance/pico4s_controller`, the PICO 4 Ultra path, not
the `khr/simple_controller` fall-through.

**The scene registration fix works on hardware.** `Running "VRQuestScene"` plus
`.VRActivity` means the activity mounts Viro's own entry point. Removing
`registerImmersiveScene` from the example was correct.

**Plane detection is absent.** `planeDetection=no fbScene=no` on PICO 4 Ultra.
Neither `XR_EXT_plane_detection` nor the `XR_FB_scene` trio is available, so the
capability settles to `false` and never `true`. This is what
`device-profiles.md:17-25` predicted from source, and why the runbook moved the
`null -> true` case to Quest as Q06. The prediction held.

**Worth a look:** the renderer emulates a STAGE floor at 0.889 m then reports
eye height 1.169 m against its own expected 1.3–1.8 m range. Its diagnostic
fires. Either the offset is too small or the app space is not the one it
assumes. Content placed relative to the floor will sit wrong until this is
understood.

**This device reports `PAGE_SIZE 4096`.** Building 16KB-safe still protects
against Android 15+ PICO OS; the two PPS loaders would not fail on this unit.

## Blocked, and on what

1. **Simulator slice — terminal, not deferred.** `ios/Podfile:10` pins
   `GVRAudioSDK 1.140.0`, the final release of an SDK Google archived in 2019.
   Its arm64 slice is device-iOS, and it is referenced by 8 source files, so
   spatial audio goes with it. An `.xcframework` is necessary but not
   sufficient: `lipo` cannot hold device-arm64 and simulator-arm64 together.
   Closing it means replacing or excluding the audio dependency, which is a
   support-matrix decision.
2. **Web suites** — `@reactvision/viro-web-renderer` is unpublished with no
   public repo. Set `WEB_RENDERER_DIR` and the lane runs; the jest split already
   reports it as blocked rather than green.
3. **PPS 16KB** — `pps_platform_java_base` has exactly one published version and
   it ships 4KB-aligned loaders. Upstream at PICO. The build names both in
   `--allow`, and an allowance that stops matching is a failure, so the build
   will tell you the day PICO republishes.

## Open decisions

1. **`nitro-canvas-in-Vision`.** Struck from viro's package entry, because
   re-exporting the canvas panels made every consumer fail to bundle: the module
   is 404 on npm, declared nowhere, and cannot be published under its current
   name — npm rejects uppercase and it is spelled with a capital V. No source
   file in any of the six projects imported the four struck symbols. Deep-import
   still works. Renaming and publishing it is the way back.
2. **viro#526 drift.** Upstream's merge reverted the Quest scene root to
   `ViroScene` and states it costs all detected surfaces; this fork mounts
   `ViroARScene` gated on `isVisionOS`. Since PICO reports no plane source
   either way, the practical difference is Quest-only — but the fork's root is
   what upstream's own platform matrix documents as supported.
3. **OS 5 metadata and entitlement.** Another app on the same headset launches
   with a placeholder app id and no dialog at all; its manifest declares none of
   the OS 5 metadata this plugin emits. So the entitlement path is entered
   because of what an OS 5 build declares, not because an app is sideloaded.
   Building without it would sidestep entitlement at the cost of the OS 5
   capabilities.

## Where the rest is written down

- `docs/VIRO-PICO-RELEASE-EVIDENCE.md` — the evidence ledger, linked from all
  three PR bodies
- `docs/PICO-ENTITLEMENT-BLOCKS-LAUNCH.md` — entitlement trace
- `docs/PPS-16KB-BLOCKER.md` — the 4KB loaders, with what to send PICO
- `viro/docs/pico/g5-runbook.md` — the unexecuted cases, every command cited
- `viro/docs/pico/g5-results.md` — what the device has answered so far
- `viro/docs/pico/a11y-review.md`, `virocore/docs/pico/` — the design and review
  passes
