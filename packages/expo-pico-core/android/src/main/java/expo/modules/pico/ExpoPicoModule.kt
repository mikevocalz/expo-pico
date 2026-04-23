package expo.modules.pico

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.pico.os6.PicoOs6Runtime
import expo.modules.pico.swan.PicoSwanRuntime

class ExpoPicoModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPico")

        Constants(
            "isPicoBuild" to Config.isPicoBuild,
            "isPicoDevice" to PicoDeviceUtils.isPicoDevice(),
            "spatialMode" to BuildConfig.PICO_SPATIAL_MODE.ifEmpty { "2d" },
            "targetProfile" to BuildConfig.PICO_TARGET_PROFILE.ifEmpty { "unknown" },
            "containerMode" to BuildConfig.PICO_CONTAINER_MODE.ifEmpty { "none" },
            "xrMode" to BuildConfig.PICO_XR_MODE.ifEmpty { "mobile" },
            "appType" to BuildConfig.PICO_APP_TYPE.ifEmpty { "2d" },
            "picoAppId" to BuildConfig.PICO_APP_ID.ifEmpty { null },
            "picoAppKey" to BuildConfig.PICO_APP_KEY.ifEmpty { null },
            "hasPlatformIdentity" to BuildConfig.PICO_HAS_PLATFORM_IDENTITY,
            "hasIapIdentity" to BuildConfig.PICO_HAS_IAP_IDENTITY,
            "picoOsVersion" to PicoDeviceUtils.getPicoOsVersion(),
            "deviceModel" to PicoDeviceUtils.getDeviceModel(),
            "emulatorOptimizations" to BuildConfig.PICO_EMULATOR_OPTIMIZATIONS,
            "swanRuntimeInitialized" to PicoSwanRuntime.isInitialized(),
            "os6RuntimeInitialized" to PicoOs6Runtime.isInitialized()
        )
    }
}
