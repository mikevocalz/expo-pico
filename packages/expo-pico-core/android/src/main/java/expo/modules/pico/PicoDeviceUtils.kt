package expo.modules.pico

import android.os.Build

object PicoDeviceUtils {

    private const val PICO_MANUFACTURER = "Pico"
    private const val PICO_BRAND = "PICO"

    fun isPicoDevice(): Boolean {
        return Build.MANUFACTURER.equals(PICO_MANUFACTURER, ignoreCase = true) ||
               Build.BRAND.equals(PICO_BRAND, ignoreCase = true)
    }

    fun getPicoOsVersion(): String? {
        if (!isPicoDevice()) return null
        return readSystemProperty("ro.pico.os.version")
    }

    fun getDeviceModel(): String? {
        if (!isPicoDevice()) return null
        return Build.MODEL.ifEmpty { null }
    }

    /**
     * Detects the runtime target profile from device model string.
     * Used when BuildConfig.PICO_TARGET_PROFILE is "auto" or empty.
     */
    fun detectTargetProfile(): String {
        if (!isPicoDevice()) return "unknown"
        val model = Build.MODEL.uppercase()
        return when {
            model.contains("SWAN") -> "swan"
            model.contains("4 ULTRA") || model.contains("4ULTRA") -> "pico4ultra"
            model.contains("PICO 4") || model.contains("4E") -> "pico4"
            model.contains("NEO3") || model.contains("NEO 3") -> "legacy"
            else -> "pico4" // default for unrecognized PICO hardware
        }
    }

    private fun readSystemProperty(key: String): String? {
        return try {
            val clazz = Class.forName("android.os.SystemProperties")
            val method = clazz.getMethod("get", String::class.java, String::class.java)
            val value = method.invoke(null, key, "") as? String
            value?.ifEmpty { null }
        } catch (_: Exception) {
            null
        }
    }
}
