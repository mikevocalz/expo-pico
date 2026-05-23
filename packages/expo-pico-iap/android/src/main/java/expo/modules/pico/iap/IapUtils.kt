package expo.modules.pico.iap

import expo.modules.pico.PicoPlatformSdkDetector

object IapUtils {
    fun isIapSdkAvailable(): Boolean {
        return PicoPlatformSdkDetector.probeAny(
            "com.pvr.iap.sdk.IAPClient",
            "com.pico.pps.sdk.iap.PicoIapClient",
        )
    }

    fun getIapSdkVersion(): String? = null
}
