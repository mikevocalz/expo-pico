# `patches/virocore/` — removed

The native-renderer changes that used to live here as patch files are now
committed directly to the canonical fork:

> **github.com/mikevocalz/virocore** — branch `v2.55.0-nitro-canvas`

That fork is the source of truth for `libviro_renderer.so` consumed by
this project's own fork of `@reactvision/react-viro` (github.com/mikevocalz/viro).
No patches are applied at install time.

This README is the only file left in this directory — it maps each removed
patch to the fork commit that supersedes it, for anyone who finds an old
reference and needs to know where the changes went.

## What used to be here

| File | What it documents | Where it lives now (commits in `~/virocore`) |
|---|---|---|
| `virocore-v2.55.0-nitro-canvas.patch` | The CanvasInVision bridge: `VROExternalSurfaceTexture`, `VROExternalSurfaceTextureRegistry`, `VROMaterial::setExternalSurfaceTexture`, JNI binding in `Material_JNI.cpp`, per-frame `refreshAll` hook in `VROSceneRendererOpenXR.cpp`. | Commits `62038d6a`, `3f54d4c6`, `68c979af`, plus the uncommitted Material + Java sweep on the working branch. |
| `VROSceneRendererOpenXR.pico-compat.{diff,patch}` | PICO compatibility: surface real `XrResult` instead of swallowing it, make `XR_KHR_android_create_instance` optional. | Commit `a6fdd571` ("PICO compat: OpenXR scene-renderer + multi-profile controller bindings"). |
| `VROInputControllerOpenXR.pico-controllers.diff` | Multi-profile controller bindings for PICO Sense + Quest Touch in one binary. | Same commit (`a6fdd571`). |

## How to build the corrected `libviro_renderer.so`

Build directly from the fork — no patch step needed.

```bash
git clone https://github.com/mikevocalz/virocore.git
cd virocore
git checkout v2.55.0-nitro-canvas
# Follow virocore's existing Android build (Gradle / NDK).
# Resulting AAR drops into your local @reactvision/react-viro fork at
#   ~/viro/android/viro_renderer/viro_renderer-release.aar
# Then ship @reactvision/react-viro from your fork.
```

Once `@reactvision/react-viro` is published from the fork, the
`patches/virocore/` directory can be removed in its entirety — including
this README.
