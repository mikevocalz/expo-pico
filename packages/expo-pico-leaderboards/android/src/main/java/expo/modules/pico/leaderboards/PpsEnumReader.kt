package expo.modules.pico.leaderboards

import java.util.concurrent.ConcurrentHashMap

/**
 * Reads `public static final int` constants from the PPS SWIG enum classes
 * (`com.bytedance.pico.platformsdk.jni.ppf*`). Those fields are not compile-time
 * constants: each class's static initializer fills them from native getters such
 * as `PicoJNI.ppfLeaderboard_FilterFriends_get()`, so the ints are only known at
 * runtime and must not be hard-coded.
 *
 * Touching the class runs `PicoJNI`'s static initializer, which loads
 * `libpxrplatformloader4j`. If that library is missing the read fails with a
 * LinkageError, which is reported as a rejection instead of a guessed value.
 */
internal object PpsEnumReader {
    private const val JNI_PACKAGE = "com.bytedance.pico.platformsdk.jni"
    private val cache = ConcurrentHashMap<String, Int>()

    fun read(enumClass: String, field: String): PpsEnumValue {
        val key = "$enumClass.$field"
        cache[key]?.let { return PpsEnumValue.Resolved(it) }
        try {
            val value = Class.forName("$JNI_PACKAGE.$enumClass").getField(field).getInt(null)
            cache[key] = value
            return PpsEnumValue.Resolved(value)
        } catch (t: Throwable) {
            return PpsEnumValue.Rejected(
                "PPS_ENUM_UNAVAILABLE",
                "Could not read $JNI_PACKAGE.$key from the PICO Platform SDK " +
                    "(${t.javaClass.simpleName}: ${t.message})"
            )
        }
    }
}
