package expo.modules.pico.rtc

object RtcUtils {
    /**
     * Checks whether the PICO RTC SDK class is on the classpath.
     * Extension seam: replace class name with the real PICO RTC SDK entry point
     * once the AAR is integrated and the class name is publicly documented.
     */
    fun isRtcSdkAvailable(): Boolean {
        return try {
            Class.forName("com.pvr.rtc.sdk.RtcEngine")
            true
        } catch (_: ClassNotFoundException) {
            false
        }
    }

    fun getRtcSdkVersion(): String? {
        // Extension seam: return SDK version string from the SDK class once available.
        return null
    }
}
