package expo.modules.pico.rtc

object RtcUtils {
    // PPS 1.0.x has no RTC client. Only legacy PVR
    // `com.pvr.rtc.sdk.RtcEngine` would make this available.
    fun isRtcSdkAvailable(): Boolean = runCatching {
        Class.forName("com.pvr.rtc.sdk.RtcEngine")
    }.isSuccess

    fun getRtcSdkVersion(): String? = null
}
