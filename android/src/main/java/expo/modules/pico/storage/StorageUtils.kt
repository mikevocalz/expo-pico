package expo.modules.pico.storage

internal object StorageUtils {
  // PPS 1.0.x has no cloud-storage client. Only legacy PVR
  // `com.pvr.platform.sdk.storage.CloudStorageAPI` would make this
  // available.
  fun isStorageSdkAvailable(): Boolean = runCatching {
    Class.forName("com.pvr.platform.sdk.storage.CloudStorageAPI")
  }.isSuccess

  fun getStorageSdkVersion(): String = if (isStorageSdkAvailable()) "pvr-legacy" else "unavailable"
}
