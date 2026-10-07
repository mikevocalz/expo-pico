---
'@expo-pico/core': patch
---

`enterImmersiveScene()` now asks for the eye tracking permission before it launches the immersive activity: `com.oculus.permission.EYE_TRACKING` on the `quest` flavor and `com.picovr.permission.EYE_TRACKING` on PICO builds. Viro's OpenXR renderer targets with `XR_EXT_eye_gaze_interaction`, and the runtime keeps the gaze pose inactive until the app holds the permission. react-viro's plugin declares it in the manifest but nothing requested it at runtime, so on Meta VR Glasses look-and-pinch never activated and selection fell back to the hand ray. The request happens once per process, only when the manifest declares the permission and it is not yet granted, and never on the `mobile` flavor. A denial is logged and the scene still opens. `ensureEyeTrackingPermission(mode)` is exported for apps that start the scene another way.
