---
'@expo-pico/core': patch
---

The staged `libviro_renderer.so` is rebuilt from mikevocalz/virocore `a346988f` (PRs #103 through #109). On Quest, when the runtime has no controller model about 8 seconds after the controller is tracked (for example because `com.oculus.permission.RENDER_MODEL` is missing), the hand now shows the neutral mesh and keeps polling for the runtime model instead of staying empty.
