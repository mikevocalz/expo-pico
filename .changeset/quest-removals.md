---
'@expo-pico/core': minor
---

New quest-only options on the `expo-horizon-core` plugin entry: `questRemovePermissions` and `questRemoveFeatures` write `tools:node="remove"` entries into `app/src/quest/AndroidManifest.xml`, and `questExcludeDependencies` excludes `group:module` coordinates from the quest compile and runtime classpaths. Use them for permissions, features and libraries that another package adds to every flavor but the Meta Horizon build never uses. pico, dual, mobile and main are untouched.
