package expo.modules.pico.notifications

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
        return try {
            Class.forName("com.pvr.push.sdk.PushSDK")
            true
        } catch (_: ClassNotFoundException) {
            false
        }
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
