---
'@expo-pico/core': patch
---

The phone APK no longer declares `android.hardware.vr.headtracking`. `@reactvision/react-viro` 3.0.2 in QUEST mode writes it into the main manifest with `android:required="true"`, so the mobile flavor inherited a hard requirement that no phone meets, and Play and the package installer refused it. The finalized mod that strips Meta entries now also writes `<uses-feature android:name="android.hardware.vr.headtracking" tools:node="remove"/>` into the mobile flavor manifest. Removal beats `required="false"`: phones have no VR head tracking, and nothing in the mobile build reads the declaration (runtime probes use `PackageManager.hasSystemFeature`). The quest flavor keeps `required="true"` and the pico flavor keeps its own `required="false"`.
