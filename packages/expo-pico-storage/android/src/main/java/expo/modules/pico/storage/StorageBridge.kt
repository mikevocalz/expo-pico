package expo.modules.pico.storage

/**
 * StorageBridge isolates all PICO Platform SDK cloud storage calls.
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * See: https://developer.picoxr.com/document/unreal/cloud-storage/
 */
internal object StorageBridge {

  @Volatile
  var moduleRef: ExpoPicoStorageModule? = null

  fun saveEntry(
    key: String,
    value: String,
    conflictPolicy: String,
    maxBytes: Int,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   CloudStorageAPI.getInstance().put(key, value.toByteArray(), conflictPolicy) { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "key"           to key,
    //       "version"       to result.version,
    //       "conflict"      to result.hasConflict,
    //       "resolvedValue" to result.resolvedValue
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "saveEntry failed")
    //   }
    onError("NOT_IMPLEMENTED", "saveEntry: Storage SDK not yet linked.")
  }

  fun loadEntry(
    key: String,
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   CloudStorageAPI.getInstance().get(key) { result ->
    //     onSuccess(mapOf(
    //       "key"     to key,
    //       "value"   to result.value?.let { String(it) },
    //       "version" to (result.version ?: 0),
    //       "found"   to result.found
    //     ))
    //   }
    onError("NOT_IMPLEMENTED", "loadEntry: Storage SDK not yet linked.")
  }

  fun deleteEntry(
    key: String,
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): CloudStorageAPI.getInstance().delete(key) { result -> ... }
    onError("NOT_IMPLEMENTED", "deleteEntry: Storage SDK not yet linked.")
  }

  fun listKeys(
    onSuccess: (List<String>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): CloudStorageAPI.getInstance().listKeys { result -> ... }
    onError("NOT_IMPLEMENTED", "listKeys: Storage SDK not yet linked.")
  }

  fun syncStorage(
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   CloudStorageAPI.getInstance().sync { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "syncedCount"   to result.syncedCount,
    //       "conflictCount" to result.conflictCount,
    //       "errorCount"    to result.errorCount,
    //       "syncedAt"      to System.currentTimeMillis()
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "syncStorage failed")
    //   }
    onError("NOT_IMPLEMENTED", "syncStorage: Storage SDK not yet linked.")
  }

  fun getStorageQuota(
    onSuccess: (Map<String, Any?>) -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk):
    //   CloudStorageAPI.getInstance().getQuota { result ->
    //     if (result.isSuccess) onSuccess(mapOf(
    //       "usedBytes"   to result.usedBytes,
    //       "totalBytes"  to result.totalBytes,
    //       "entryCount"  to result.entryCount,
    //       "maxEntries"  to result.maxEntries
    //     ))
    //     else onError("UNKNOWN", result.errorMessage ?: "getStorageQuota failed")
    //   }
    onError("NOT_IMPLEMENTED", "getStorageQuota: Storage SDK not yet linked.")
  }

  fun clearLocalCache(
    onSuccess: () -> Unit,
    onError: (String, String) -> Unit,
  ) {
    // TODO(pico-sdk): CloudStorageAPI.getInstance().clearLocalCache { result -> ... }
    onError("NOT_IMPLEMENTED", "clearLocalCache: Storage SDK not yet linked.")
  }
}
