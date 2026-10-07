---
'@expo-pico/core': patch
---

Quest builds with `viroRendererOverlay` now show Meta's own controller models. The staged `libviro_renderer.so` is rebuilt from mikevocalz/virocore `5aac6b51` (PR #103) and loads controller meshes through `XR_FB_render_model`, falling back to the neutral mesh only where the runtime supplies none. While the renderer is staged into `quest`, the quest flavor manifest gets `com.oculus.permission.RENDER_MODEL` and an optional `com.oculus.feature.RENDER_MODEL`; turning the overlay off removes them. The pico, dual, mobile and main manifests never get either entry.
