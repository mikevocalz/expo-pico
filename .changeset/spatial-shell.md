---
'@expo-pico/spatial': minor
---

Add `createSpatialShell`, the rail, main panel and detail panel layout contract (docs/adr/0001). It turns design tokens into the rail's Meta Layout SDK window spec (flush outside the main panel's left edge), the strip a PICO main window reserves for the rail, and the detail panel's launch size. `attachedWindowFrame`, `detailPanelCommand` and `detailPanelStatusAfter` are the pure placement and detail-panel rules.
