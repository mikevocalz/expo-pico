package expo.modules.pico.iap

object IapUtils {
    fun isIapSdkAvailable(): Boolean {
        return try {
            // Extension seam — replace with actual PICO IAP SDK class name
            Class.forName("com.pvr.iap.sdk.IAPClient")
            true
        } catch (_: ClassNotFoundException) {
            false
        }
    }

    fun getIapSdkVersion(): String? = null
}
