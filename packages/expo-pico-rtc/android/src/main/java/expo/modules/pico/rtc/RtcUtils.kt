package expo.modules.pico.rtc

import expo.modules.pico.PicoPlatformSdkDetector

object RtcUtils {
    /**
     * Checks whether the PICO RTC SDK class is on the classpath.
     * Extension seam: replace class name with the real PICO RTC SDK entry point
     * once the AAR is integrated and the class name is publicly documented.
     */
    fun isRtcSdkAvailable(): Boolean {
        return PicoPlatformSdkDetector.probeAny(
            "com.pvr.rtc.sdk.RtcEngine",
            "com.pico.pps.sdk.rtc.PicoRtcClient",
        ) || PicoPlatformSdkDetector.isAnyPlatformSdkPresent()
    }

    fun getRtcSdkVersion(): String? {
        // Extension seam: return SDK version string from the SDK class once available.
        return null
    }
}
