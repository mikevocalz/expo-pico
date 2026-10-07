---
'@expo-pico/core': patch
---

`viroRendererOverlay` now stages `libviro_renderer.so` and `controller_neutral.glb` into the `quest` flavor as well as `pico` / `dual`. Since 1.0.0 the overlay only reached the PICO flavors, so Quest builds fell back to the stock ViroReact 3.0.2 renderer: the floor sat at eye level and controller models were missing. The OpenXR loader overlay stays in `pico` / `dual`; stock Viro 3.0.2 already ships a 16KB-aligned loader that the overlay renderer links against. `main` and `mobile` get neither, and turning the option off removes the quest copies.
