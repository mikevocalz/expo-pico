package expo.modules.pico.storage

import expo.modules.pico.PicoPlatformSdkDetector

internal object StorageUtils {
  private val SDK_AVAILABLE: Boolean by lazy {
    PicoPlatformSdkDetector.probeAny(
      "com.pvr.platform.sdk.storage.CloudStorageAPI",
      "com.pico.pps.sdk.storage.PicoStorageClient",
    ) || PicoPlatformSdkDetector.isAnyPlatformSdkPresent()
  }

  fun isStorageSdkAvailable(): Boolean = SDK_AVAILABLE

  fun getStorageSdkVersion(): String {
    if (!SDK_AVAILABLE) return "unavailable"
    return try {
      Class.forName("com.pvr.platform.sdk.BuildConfig")
        .getField("STORAGE_SDK_VERSION")
        .get(null) as? String ?: "unknown"
    } catch (_: Exception) {
      "unknown"
    }
  }
}
