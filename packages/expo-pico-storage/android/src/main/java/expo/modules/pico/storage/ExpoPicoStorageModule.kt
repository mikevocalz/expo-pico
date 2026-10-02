package expo.modules.pico.storage

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoStorageModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoPicoStorage")

    Events("onStorageConflict", "onStorageSyncProgress", "onStorageSyncComplete")

    Constants {
      mapOf(
        "storageSdkAvailable" to StorageUtils.isStorageSdkAvailable(),
        "storageSdkVersion"   to StorageUtils.getStorageSdkVersion()
      )
    }

    // key: String, value: String, conflictPolicy: String, maxBytes: Int
    AsyncFunction("saveEntry") { key: String, value: String, conflictPolicy: String, maxBytes: Int, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      StorageBridge.saveEntry(key, value, conflictPolicy, maxBytes,
        onSuccess = { result -> promise.resolve(result) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("loadEntry") { key: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      StorageBridge.loadEntry(key,
        onSuccess = { result -> promise.resolve(result) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("deleteEntry") { key: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      StorageBridge.deleteEntry(key,
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("listKeys") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      StorageBridge.listKeys(
        onSuccess = { keys -> promise.resolve(keys) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("syncStorage") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      StorageBridge.syncStorage(
        onSuccess = { result -> promise.resolve(result) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("getStorageQuota") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      StorageBridge.getStorageQuota(
        onSuccess = { quota -> promise.resolve(quota) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("clearLocalCache") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      StorageBridge.clearLocalCache(
        onSuccess = { promise.resolve(null) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }
  }

  internal fun emitStorageConflict(key: String, clientValue: String, serverValue: String, clientVersion: Int, serverVersion: Int) {
    sendEvent("onStorageConflict", mapOf(
      "key"           to key,
      "clientValue"   to clientValue,
      "serverValue"   to serverValue,
      "clientVersion" to clientVersion,
      "serverVersion" to serverVersion
    ))
  }

  internal fun emitSyncProgress(phase: String, completedCount: Int, totalCount: Int) {
    sendEvent("onStorageSyncProgress", mapOf(
      "phase"          to phase,
      "completedCount" to completedCount,
      "totalCount"     to totalCount
    ))
  }

  internal fun emitSyncComplete(syncedCount: Int, conflictCount: Int, errorCount: Int) {
    sendEvent("onStorageSyncComplete", mapOf(
      "syncedCount"   to syncedCount,
      "conflictCount" to conflictCount,
      "errorCount"    to errorCount,
      "syncedAt"      to System.currentTimeMillis()
    ))
  }

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!StorageUtils.isStorageSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Storage SDK not available on this build", null)
      earlyReturn()
    }
  }
}
