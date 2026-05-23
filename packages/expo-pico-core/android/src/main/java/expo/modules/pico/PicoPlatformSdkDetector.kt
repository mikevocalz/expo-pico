package expo.modules.pico

/**
 * Shared reflection-based probes for the PICO Platform SDK.
 *
 * Phase J design: sibling packages (account, iap, rtc, rooms, leaderboards,
 * achievements, storage, social, subscription, notifications) historically
 * each duplicated their own `Class.forName` try/catch. The names they
 * probed drifted — `com.pvr.platform.sdk.X`, `com.pvr.iap.sdk.Y`,
 * `com.pvr.push.sdk.Z` — and nothing tolerated the SDK being renamed.
 *
 * This object centralizes the probe primitives so siblings stay thin:
 *
 *   object AccountUtils {
 *     fun isPlatformSdkAvailable(): Boolean = PicoPlatformSdkDetector.probeAny(
 *       "com.pvr.platform.sdk.account.AccountAPI",
 *       "com.pvr.platform.sdk.PlatformSDK",  // older SDK layout fallback
 *     )
 *     fun getSdkVersion(): String? = PicoPlatformSdkDetector.readVersion()
 *   }
 *
 * Primitives:
 *   - [probeAny]         — first-hit check across a list of candidate class names.
 *   - [findAvailable]    — returns the first hit's name (useful for diagnostics).
 *   - [readStringField]  — reads a static String field off a class via
 *                          reflection, without compile-time linking.
 *   - [readVersion]      — reads `VERSION_NAME` from the canonical PICO
 *                          BuildConfig; returns null when the SDK isn't
 *                          present.
 *
 * Every primitive swallows Throwable (not just ClassNotFoundException) to
 * be defensive against NoSuchFieldError / NoClassDefFoundError / verifier
 * failures when a partially-linked SDK is on the classpath. These show
 * up in practice when a PICO AAR is present but its native .so's aren't,
 * e.g. running a PICO-flavor APK on a mobile emulator.
 */
object PicoPlatformSdkDetector {

    /**
     * The canonical BuildConfig class used by most PICO Platform SDK
     * versions. Read [readVersion] for the `VERSION_NAME` / `VERSION`
     * field. Additional probe classes are accepted there to tolerate
     * SDK layout changes.
     */
    private val VERSION_BUILDCONFIG_CANDIDATES = arrayOf(
        // Legacy PICO Platform SDK (com.pvr.platform.sdk.*)
        "com.pvr.platform.sdk.BuildConfig",
        "com.pvr.platform.BuildConfig",
        // New PICO Platform Service SDK (com.pico.pps.sdk.*) — 1.0.0+
        // published at https://artifact.bytedance.com/repository/Volcengine/
        // as com.pico.pps:platform-service-{auth,iap,achievement,...}.
        // Each module ships its own BuildConfig; any one of them being
        // present means PPS is on the classpath.
        "com.pico.pps.sdk.auth.BuildConfig",
        "com.pico.pps.sdk.iap.BuildConfig",
        "com.pico.pps.sdk.achievement.BuildConfig",
        "com.pico.pps.sdk.leaderboard.BuildConfig",
        "com.pico.pps.sdk.friend.BuildConfig",
        "com.pico.pps.sdk.push.BuildConfig",
        "com.pico.pps.sdk.social.BuildConfig",
    )

    private val VERSION_FIELD_CANDIDATES = arrayOf(
        "VERSION_NAME",
        "VERSION",
        "SDK_VERSION",
    )

    /**
     * Broad probe set: if any of these resolve on the classpath, some
     * PICO Platform SDK surface is present. Aggregated detection in
     * `ExpoPicoModule` uses this for the `platformSdkPresent` constant.
     */
    private val BROAD_PRESENCE_CANDIDATES = arrayOf(
        // Legacy PICO Platform SDK (com.pvr.platform.sdk.*) — older devices.
        "com.pvr.platform.sdk.PlatformSDK",
        "com.pvr.platform.sdk.account.AccountAPI",
        "com.pvr.platform.sdk.achievements.AchievementsAPI",
        "com.pvr.platform.sdk.leaderboard.LeaderboardAPI",
        "com.pvr.platform.sdk.room.RoomService",
        "com.pvr.platform.sdk.social.FriendsAPI",
        "com.pvr.platform.sdk.storage.CloudStorageAPI",
        "com.pvr.platform.sdk.subscription.SubscriptionService",
        "com.pvr.iap.sdk.IAPClient",
        "com.pvr.push.sdk.PushSDK",
        "com.pvr.rtc.sdk.RtcEngine",
        // New PICO Platform Service SDK (com.pico.pps.sdk.*) published at
        // https://artifact.bytedance.com/repository/Volcengine/. Class
        // names confirmed against the 1.0.1-alpha.13 AAR contents.
        //
        // Modern client classes — present in iap, achievement, leaderboard,
        // social AARs.
        "com.pico.pps.sdk.iap.PicoIapClient",
        "com.pico.pps.sdk.iap.IapClient",
        "com.pico.pps.sdk.achievement.AchievementClient",
        "com.pico.pps.sdk.leaderboard.LeaderboardClient",
        "com.pico.pps.sdk.social.PicoSocialClient",
        // Matrix Action classes — auth, friend, push ship this shape
        // instead of a dedicated client class in 1.0.1-alpha.13.
        "com.bytedance.pico.matrix.action.AuthAction",
        "com.bytedance.pico.matrix.action.FriendAction",
        "com.bytedance.pico.matrix.action.PPSPushAction",
        "com.bytedance.pico.matrix.action.SocialAction",
        "com.bytedance.pico.matrix.action.IapAction",
        // BuildConfig fallback — every PPS service AAR includes one and
        // it never conflicts with app code (BuildConfig is internal).
        "com.pico.pps.sdk.auth.BuildConfig",
        "com.pico.pps.sdk.iap.BuildConfig",
        "com.pico.pps.sdk.achievement.BuildConfig",
        "com.pico.pps.sdk.leaderboard.BuildConfig",
        "com.pico.pps.sdk.friend.BuildConfig",
        "com.pico.pps.sdk.push.BuildConfig",
        "com.pico.pps.sdk.social.BuildConfig",
    )

    /**
     * @return true if any of [candidates] resolves on the classpath.
     *   Uses the caller's classloader via `Class.forName(name)` (no
     *   initialization — we only care about presence, not linkage of
     *   native libs the class might lazy-load on first use).
     */
    @JvmStatic
    fun probeAny(vararg candidates: String): Boolean {
        return findAvailable(*candidates) != null
    }

    /**
     * @return the first candidate name that resolves, or null if none do.
     *   Useful when a caller wants to report which SDK variant it found.
     */
    @JvmStatic
    fun findAvailable(vararg candidates: String): String? {
        for (name in candidates) {
            try {
                Class.forName(name, /* initialize = */ false, PicoPlatformSdkDetector::class.java.classLoader)
                return name
            } catch (_: Throwable) {
                /* keep probing */
            }
        }
        return null
    }

    /**
     * Read a static String field from a class resolved by name. Returns
     * null when the class, the field, or the linkage fails — never
     * throws. Primarily used by [readVersion] and sibling callers that
     * want to expose their own SDK version strings.
     */
    @JvmStatic
    fun readStringField(className: String, fieldName: String): String? {
        return try {
            val clazz = Class.forName(className, /* initialize = */ false, PicoPlatformSdkDetector::class.java.classLoader)
            val field = clazz.getDeclaredField(fieldName)
            field.isAccessible = true
            (field.get(null) as? String)?.takeIf { it.isNotEmpty() }
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Best-effort PICO Platform SDK version reader. Tries each
     * (buildConfigClass × versionField) pair from the candidate lists
     * and returns the first non-empty result. Returns null when no
     * version info is readable.
     */
    @JvmStatic
    fun readVersion(): String? {
        for (cls in VERSION_BUILDCONFIG_CANDIDATES) {
            for (field in VERSION_FIELD_CANDIDATES) {
                val v = readStringField(cls, field)
                if (v != null) return v
            }
        }
        return null
    }

    /**
     * Aggregate presence flag. True when any of the known PICO SDK
     * entry classes resolve on the classpath. Used by
     * `ExpoPicoModule.platformSdkPresent` constant.
     */
    @JvmStatic
    fun isAnyPlatformSdkPresent(): Boolean {
        return probeAny(*BROAD_PRESENCE_CANDIDATES)
    }

    /**
     * Fine-grained probe report. Each entry is (feature-name, present).
     * Consumers can render this verbatim in a diagnostics panel
     * without needing to know the canonical PICO class names.
     */
    @JvmStatic
    fun buildProbeReport(): Map<String, Boolean> {
        return mapOf(
            "account" to probeAny(
                "com.pvr.platform.sdk.account.AccountAPI",
                "com.pvr.platform.sdk.PlatformSDK",
            ),
            "iap" to probeAny(
                "com.pvr.iap.sdk.IAPClient",
                "com.pvr.platform.sdk.iap.IAPClient",
            ),
            "achievements" to probeAny(
                "com.pvr.platform.sdk.achievements.AchievementsAPI",
            ),
            "leaderboards" to probeAny(
                "com.pvr.platform.sdk.leaderboard.LeaderboardAPI",
            ),
            "rooms" to probeAny(
                "com.pvr.platform.sdk.room.RoomService",
            ),
            "social" to probeAny(
                "com.pvr.platform.sdk.social.FriendsAPI",
            ),
            "storage" to probeAny(
                "com.pvr.platform.sdk.storage.CloudStorageAPI",
            ),
            "subscription" to probeAny(
                "com.pvr.platform.sdk.subscription.SubscriptionService",
            ),
            "notifications" to probeAny(
                "com.pvr.push.sdk.PushSDK",
                "com.pvr.platform.sdk.push.PushSDK",
            ),
            "rtc" to probeAny(
                "com.pvr.rtc.sdk.RtcEngine",
                "com.pvr.platform.sdk.rtc.RtcEngine",
            ),
        )
    }
}
