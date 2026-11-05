---
'@expo-pico/spatial': patch
---

`SpatialWindowSpec` takes an optional `windowBackgroundColor`, passed through to Meta's `<SpatialWindow>`. Without it, a Layout SDK window paints the app theme's `android:windowBackground` behind its content. In an Expo app that is the white splash background, and on a Quest 3S it showed as a thin light arc at each rounded corner of the rail. Set it to the content's own background color.
