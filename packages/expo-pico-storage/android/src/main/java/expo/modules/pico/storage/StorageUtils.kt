package expo.modules.pico.storage

internal object StorageUtils {
  private val SDK_AVAILABLE: Boolean by lazy {
    try {
      Class.forName("com.pvr.platform.sdk.storage.CloudStorageAPI")
      true
    } catch (_: ClassNotFoundException) {
      false
    }
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
