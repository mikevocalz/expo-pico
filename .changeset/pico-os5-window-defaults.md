---
'@expo-pico/core': minor
---

PICO OS 5 window defaults. PICO builds get a translucent main window and a `PicoPanelActivity` with its own `pico.vr.position`, opened at a dp size through `new PicoWindows().createPanelHost()`. The prebuild and a merged-manifest Gradle check fail on a `pico.vr.position` that would reuse another activity's window or make it a popup. The prebuild also moves Viro's `.VRActivity` off `MAIN` so the one-launcher-tile check passes with published `@reactvision/react-viro`. Turn either default off with the `windows` plugin option.
