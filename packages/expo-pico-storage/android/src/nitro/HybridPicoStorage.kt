package com.margelo.nitro.expopico.storage

import com.margelo.nitro.core.Promise

/**
 * `PicoStorage` — no PICO Platform Service artifact exists behind it.
 *
 * There is no `platform-service-storage` on the Volcengine repo, and no
 * cloud-save surface on any of the eleven artifacts that are published.
 * `docs/PPS-WIRING-GAPS.md` records this as confirmed against the
 * artifacts themselves, not inferred from documentation.
 *
 * Reporting the service as unavailable is the correct behaviour rather
 * than a placeholder: an app that silently wrote to device-local storage
 * under a "cloud save" API would lose player data at reinstall, and one
 * that resolved empty results would look like a wiped save. Both are worse
 * than a clear failure the caller can branch on.
 */
class HybridPicoStorage : HybridPicoStorageSpec() {

  override val available: Boolean
    get() = false

  override val sdkVersion: String
    get() = ""

  override val status: StorageStatus
    get() = StorageStatus.UNAVAILABLE

  override fun saveEntry(
    key: String,
    value: String,
    type: StorageEntryType,
    options: StorageSaveOptions?,
  ): Promise<StorageSaveResult> = Promise.rejected(notInPps("saveEntry"))

  override fun loadEntry(key: String): Promise<StorageLoadResult> =
    Promise.rejected(notInPps("loadEntry"))

  override fun deleteEntry(key: String): Promise<Unit> =
    Promise.rejected(notInPps("deleteEntry"))

  override fun listKeys(): Promise<Array<String>> =
    Promise.rejected(notInPps("listKeys"))

  override fun syncStorage(): Promise<StorageSyncResult> =
    Promise.rejected(notInPps("syncStorage"))

  override fun getStorageQuota(): Promise<StorageQuota> =
    Promise.rejected(notInPps("getStorageQuota"))

  /**
   * The one call that can honestly succeed: there is no local cache to
   * clear, so clearing it is a no-op that has already happened.
   */
  override fun clearLocalCache(): Promise<Unit> = Promise.resolved(Unit)

  override fun addStorageConflictListener(listener: (event: StorageConflictEvent) -> Unit): Double =
    nextListenerId()

  override fun addStorageSyncProgressListener(
    listener: (event: StorageSyncProgressEvent) -> Unit
  ): Double = nextListenerId()

  override fun addStorageSyncCompleteListener(listener: (result: StorageSyncResult) -> Unit): Double =
    nextListenerId()

  override fun removeListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  private fun nextListenerId(): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  private fun notInPps(what: String): Throwable =
    UnsupportedOperationException(
      "NOT_IN_PPS_1_0: $what has no PICO Platform Service backing. PPS 1.0.x " +
        "publishes no cloud-storage artifact."
    )
}
