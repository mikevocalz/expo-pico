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
 *   - [PICO_OS5]:   PICO OS 5 / legacy PVR XR runtime. Used by PICO 4 /
 *                   PICO 4 Ultra. Triggers entitlement check seam +
 *                   platform-service registration via [PicoOs5Runtime].
 *   - [PICO_SWAN]:  Project Swan / PICO OS 6 next-gen spatial runtime.
 *                   Triggers Swan-only initialization in [PicoSwanRuntime].
 */
enum class PicoXRPlatform {
    MOBILE,
    PICO_OS5,
    PICO_SWAN;

    companion object {
        /**
         * Convert the plugin-emitted xrMode string (one of `mobile`,
         * `pico-os5`, `pico-swan`) into a [PicoXRPlatform]. Unknown or
         * empty values resolve to [MOBILE] so that runtime detection
         * never throws on a malformed BuildConfig field.
         */
        @JvmStatic
        fun fromValue(value: String?): PicoXRPlatform = when (value?.lowercase()) {
            "pico-swan", "pico_swan" -> PICO_SWAN
            // `pico-os6` accepted as a legacy alias — earlier releases used
            // OS6 as the name for what is actually the OS5 / PVR code path.
            "pico-os5", "pico_os5", "pico-os6", "pico_os6" -> PICO_OS5
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
