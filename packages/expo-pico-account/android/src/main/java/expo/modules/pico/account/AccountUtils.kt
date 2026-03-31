package expo.modules.pico.account

import android.os.Build

object AccountUtils {

    /**
     * Checks whether the PICO Platform SDK class is available on this device.
     *
     * Extension seam: replace class name with the actual PICO Platform SDK
     * entry point class once the AAR is integrated.
     * Expected: "com.pvr.platform.sdk.PlatformSDK" or similar.
     */
    fun isPlatformSdkAvailable(): Boolean {
        return try {
            // Extension seam — class name TBD pending public SDK docs
            Class.forName("com.pvr.platform.sdk.PlatformSDK")
            true
        } catch (_: ClassNotFoundException) {
            false
        }
    }

    fun getPlatformSdkVersion(): String? {
        // Extension seam: return SDK version from the SDK class when available
        return null
    }

    fun isPicoDevice(): Boolean =
        Build.MANUFACTURER.equals("Pico", ignoreCase = true) ||
        Build.BRAND.equals("PICO", ignoreCase = true)
}
