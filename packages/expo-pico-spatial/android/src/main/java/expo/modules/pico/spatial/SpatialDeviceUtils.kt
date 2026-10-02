package expo.modules.pico.spatial

import android.os.Build
import android.content.pm.PackageManager

object SpatialDeviceUtils {

    private const val PICO_MANUFACTURER = "Pico"
    private const val PICO_BRAND = "PICO"

    private const val FEATURE_HAND_TRACKING = "pico.hardware.handtracking"
    private const val FEATURE_PASSTHROUGH = "pico.hardware.passthrough"
    private const val FEATURE_SCENE = "pico.software.scene"
    private const val FEATURE_SPATIAL_ANCHOR = "pico.software.spatialanchor"
    private const val FEATURE_VR_HEADTRACKING = "android.hardware.vr.headtracking"

    fun isPicoDevice(): Boolean =
        Build.MANUFACTURER.equals(PICO_MANUFACTURER, ignoreCase = true) ||
        Build.BRAND.equals(PICO_BRAND, ignoreCase = true)

    /**
     * Reads the current space state from the PICO OS system property.
     *
     * PICO OS 6 exposes space state via `ro.pico.spatial.spacestate`.
     * Returns "unknown" on pre-OS6 devices or non-PICO hardware.
     *
     * Extension seam: when the PICO Spatial SDK provides a stable Java/Kotlin
     * API for querying space state, replace this system-property read with
     * the SDK call (e.g. SpatialManager.getSpaceState()).
     */
    fun detectSpaceState(): String {
        if (!isPicoDevice()) return "unknown"
        val prop = readSystemProperty("ro.pico.spatial.spacestate") ?: return "unknown"
        return when (prop.lowercase()) {
            "shared", "shared-space" -> "shared-space"
            "full", "full-space" -> "full-space"
            else -> "unknown"
        }
    }

    /**
     * Detects the current container type from system property.
     * Extension seam — replace with Spatial SDK API when available.
     */
    fun detectContainerType(): String {
        if (!isPicoDevice()) return "none"
        val prop = readSystemProperty("ro.pico.spatial.containertype") ?: return "none"
        return when (prop.lowercase()) {
            "window", "windowcontainer", "window-container" -> "window-container"
            "stage" -> "stage"
            else -> "none"
        }
    }

    fun getSpatialSdkVersion(): String? {
        // Extension seam: return the Spatial SDK version once the AAR is available.
        // The AAR from PICO Maven would expose a version constant.
        // Until then: read from system property if present.
        return readSystemProperty("ro.pico.spatial.sdkversion")
    }

    fun isSpatialSdkAvailable(): Boolean {
        // Extension seam: will return true when PICO Spatial SDK AAR is linked
        // and the SDK service can be bound. Currently always false.
        return false
    }

    fun supportsSpaceStates(): Boolean {
        if (!isPicoDevice()) return false
        // OS 6+ supports Shared/Full Space. Check OS version.
        val osVer = readSystemProperty("ro.pico.os.version") ?: return false
        val major = osVer.split(".").firstOrNull()?.toIntOrNull() ?: return false
        return major >= 6
    }

    fun supportsSpatialAnchors(): Boolean {
        if (!isPicoDevice()) return false
        return hasSystemFeature(FEATURE_SPATIAL_ANCHOR)
    }

    fun supportsSceneUnderstanding(): Boolean {
        if (!isPicoDevice()) return false
        return hasSystemFeature(FEATURE_SCENE)
    }

    fun supportsPassthrough(): Boolean {
        if (!isPicoDevice()) return false
        return hasSystemFeature(FEATURE_PASSTHROUGH)
    }

    fun supportsHandTracking(): Boolean {
        if (!isPicoDevice()) return false
        return hasSystemFeature(FEATURE_HAND_TRACKING)
    }

    private fun hasSystemFeature(feature: String): Boolean {
        return try {
            // PackageManager not available as a static — would need context.
            // Extension seam: inject appContext when Expo Module context is available.
            // For now, use the system property fallback.
            val prop = readSystemProperty("ro.pico.feature.${feature.replace('.', '_')}")
            prop?.equals("true", ignoreCase = true) == true
        } catch (_: Exception) {
            false
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
