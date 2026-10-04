---
'@expo-pico/core': minor
---

Add Lucide icon meshes for the immersive scene. The Eskiu runtime parses SVG element markup and builds a stroke mesh with round joins and caps. `getIconMesh`, `getLucideIconMesh` and `iconMeshToViroGeometry` return it as `ViroGeometry` props. The bundled set is 10 Lucide icons (ISC). The PICO build now needs eskiuc 0.9.3 or newer for the Eskiu runtime; without it, icon meshes throw `ESKIU_RUNTIME_UNAVAILABLE`.
