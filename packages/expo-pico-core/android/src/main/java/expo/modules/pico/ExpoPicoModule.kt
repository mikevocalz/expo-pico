package expo.modules.pico

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoPicoModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPico")

        Constants(
            "isPicoBuild" to Config.isPicoBuild,
            "isPicoDevice" to PicoDeviceUtils.isPicoDevice(),
            "spatialMode" to BuildConfig.PICO_SPATIAL_MODE.ifEmpty { "2d" },
            "targetProfile" to BuildConfig.PICO_TARGET_PROFILE.ifEmpty { "unknown" },
            "containerMode" to BuildConfig.PICO_CONTAINER_MODE.ifEmpty { "none" },
            "picoAppId" to BuildConfig.PICO_APP_ID.ifEmpty { null },
            "picoOsVersion" to PicoDeviceUtils.getPicoOsVersion(),
            "deviceModel" to PicoDeviceUtils.getDeviceModel(),
            "emulatorOptimizations" to BuildConfig.PICO_EMULATOR_OPTIMIZATIONS
        )
    }
}
