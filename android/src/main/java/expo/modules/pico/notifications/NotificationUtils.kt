package expo.modules.pico.notifications

import expo.modules.pico.PicoPlatformSdkDetector

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

object NotificationUtils {
    fun getNotificationSdkVersion(): String? {
        if (!isNotificationSdkAvailable()) return null
        return try {
            Class.forName("com.pvr.push.sdk.BuildConfig")
                .getField("PUSH_SDK_VERSION")
                .get(null) as? String
        } catch (_: Exception) {
            null
        }
    }

    fun isNotificationSdkAvailable(): Boolean {
        // PPS 1.0.1-alpha.13 ships push as
        // `com.bytedance.pico.matrix.action.PPSPushAction` rather than a
        // dedicated client class. Probe all three (legacy, future Client
        // shape, current Action shape) so detection is forward-compatible.
        return PicoPlatformSdkDetector.probeAny(
            "com.pvr.push.sdk.PushSDK",
            "com.pico.pps.sdk.push.PPSPushClient",
            "com.bytedance.pico.matrix.action.PPSPushAction",
        ) || PicoPlatformSdkDetector.isAnyPlatformSdkPresent()
    }

    private const val PREFS = "expo-pico-notifications"
    private const val KEY_REQUESTED = "postNotificationsRequested"

    /**
     * Live notification permission as the JS `NotificationPermissionStatus`.
     *
     * Android has no "never asked" API, so "not-determined" means API 33+, not
     * granted, and this module hasn't shown the prompt yet (tracked in prefs).
     * Below API 33 there is no runtime prompt: notifications are on unless the
     * user turned them off in Settings.
     */
    fun getPermissionStatus(context: Context?): String {
        if (context == null) return "not-determined"
        val enabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return if (enabled) "granted" else "denied"
        }
        val granted = ContextCompat.checkSelfPermission(
            context, Manifest.permission.POST_NOTIFICATIONS
        ) == PackageManager.PERMISSION_GRANTED
        return when {
            granted && enabled -> "granted"
            granted -> "denied"  // granted, then switched off in Settings
            wasRequested(context) -> "denied"
            else -> "not-determined"
        }
    }

    fun markRequested(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putBoolean(KEY_REQUESTED, true).apply()
    }

    private fun wasRequested(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_REQUESTED, false)
}
