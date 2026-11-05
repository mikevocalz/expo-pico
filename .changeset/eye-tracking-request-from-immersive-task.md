---
'@expo-pico/core': patch
---

The eye tracking request no longer closes XR. It went through `PermissionsAndroid`, which starts the grant dialog from the React context's current activity, and while the immersive activity is in front that can still be the 2D panel's MainActivity. The dialog opened in the panel's task, the panel resumed, and react-viro's VRActivity finished itself: on a Quest 3S the first Enter XR after install closed after about 0.4 s. The request now goes through the new `requestImmersivePermission` on `PicoCore`, which asks from the immersive activity instance itself, so the dialog stays in that activity's task. It is also skipped on headsets without eye tracking hardware (`oculus.software.eye_tracking` on Horizon OS, `picovr.software.eye_tracking` on PICO, so Quest 3/3S and PICO 4 Ultra never ask), and on PICO builds whose `eyeTracking` option is off. A denial still leaves XR open with the hand ray, and the request still happens at most once per process.
