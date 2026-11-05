---
'@expo-pico/core': minor
---

`enterImmersiveScene()` and `hasImmersiveActivity()` find Viro's `.VRActivity` by an `expo.modules.pico.IMMERSIVE_ACTIVITY` meta-data marker the plugin writes, not by its intent filter. The one-launcher-tile rules rename or remove that filter, so the old lookup found nothing and Enter XR fell back to the inline scene on Quest and PICO. Phone builds resolve no immersive activity. The launcher-tile check now ignores `tools:node="remove"` filters, which never reach the merged manifest.

A placeholder app ID (`1234567`, `your-pico-app-id`, `REPLACE_WITH_PICO_APP_ID` and similar) in `picoAppId`, `platformService.picoAppId` or `platformService.foreign.picoAppId` now fails prebuild with an error naming the field. PICO OS closes an app whose ID is not registered for its package.
