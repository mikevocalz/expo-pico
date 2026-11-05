---
'@expo-pico/core': patch
---

The staged `libopenxr_loader.so` overlay moves from Khronos 1.1.62 to 1.1.65 (`org.khronos.openxr:openxr_loader_for_android`, Maven Central). Every `PT_LOAD` segment is still aligned to `0x4000`, and it exports the same 56 symbols.
