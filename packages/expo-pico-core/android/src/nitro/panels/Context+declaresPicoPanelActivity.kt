package expo.modules.pico

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager

/**
 * True when this APK's manifest declares [PicoPanelActivity]. The
 * @expo-pico/core config plugin writes it to the PICO flavor manifest only,
 * unless the app turns `windows.panelActivity` off.
 */
internal fun Context.declaresPicoPanelActivity(): Boolean {
  try {
    packageManager.getActivityInfo(ComponentName(this, PicoPanelActivity::class.java), 0)
    return true
  } catch (_: PackageManager.NameNotFoundException) {
    return false
  }
}
