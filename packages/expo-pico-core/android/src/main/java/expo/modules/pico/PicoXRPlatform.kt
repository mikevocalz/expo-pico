package expo.modules.pico

/**
 * Native PICO XR platform mode.
 *
 * Mirrors the role of Viro's `ReactViroPackage.ViroPlatform` enum
 * (`AR | GVR | OVR_MOBILE | QUEST`). Selected at boot by reading
 * [BuildConfig.PICO_XR_MODE] which is written by the expo-pico-core
 * config plugin via `xrMode` plugin option.
 *
 *   - [MOBILE]:     No PICO runtime registration. PicoCorePackage is a no-op
 *                   except for surfacing the active platform via a getter.
 *   - [PICO_OS6]:   Standard PICO OS 6 runtime initialization (entitlement
 *                   check seam, platform-service registration seam).
 *   - [PICO_SWAN]:  Project Swan / next-gen spatial runtime. Triggers Swan-
 *                   only initialization in [PicoSwanRuntime].
 */
enum class PicoXRPlatform {
    MOBILE,
    PICO_OS6,
    PICO_SWAN;

    companion object {
        /**
         * Convert the plugin-emitted xrMode string (one of `mobile`,
         * `pico-os6`, `pico-swan`) into a [PicoXRPlatform]. Unknown or
         * empty values resolve to [MOBILE] so that runtime detection
         * never throws on a malformed BuildConfig field.
         */
        @JvmStatic
        fun fromValue(value: String?): PicoXRPlatform = when (value?.lowercase()) {
            "pico-swan", "pico_swan" -> PICO_SWAN
            "pico-os6", "pico_os6" -> PICO_OS6
            else -> MOBILE
        }

        /**
         * Resolve from BuildConfig.PICO_XR_MODE. Held in a separate getter
         * so unit tests can stub [fromValue] directly without dragging
         * BuildConfig into JVM-only test classpaths.
         */
        @JvmStatic
        fun fromBuildConfig(): PicoXRPlatform = fromValue(BuildConfig.PICO_XR_MODE)
    }
}
