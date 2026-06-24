package expo.modules.pico.notifications

import expo.modules.pico.PicoPlatformSdkDetector

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
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

    fun getPermissionStatus(context: Context?): String {
        if (context == null) return "undetermined"
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return "granted"
        return when (ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS
        )) {
            PackageManager.PERMISSION_GRANTED -> "granted"
            else -> "undetermined"
        }
    }
}
