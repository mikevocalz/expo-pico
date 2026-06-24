package expo.modules.pico.storage

/**
 * PPS 1.0.x has NO cloud storage client. PICO removed PVR CloudStorage
 * during the PVR→PPS rewrite (entitlement-checked Player Pref equivalent
 * was a PVR-only feature).
 *
 * Apps that need per-player cloud storage should run their own backend
 * keyed off the PICO openUid (account.getUserProfile().userId). For
 * device-local storage, use Expo's secure-store or AsyncStorage.
 */
internal object StorageBridge {

    private fun notInPps(method: String, onError: (String, String) -> Unit) {
        onError(
            "NOT_IN_PPS_1_0",
            "$method is not in PPS 1.0.x. PICO removed cloud storage during " +
            "the PVR→PPS rewrite. Run per-player storage on your own backend " +
            "keyed off account.getUserProfile().userId, or use expo-secure-store " +
            "for device-local storage."
        )
    }

    fun saveEntry(
        _key: String, _value: String, _conflictPolicy: String, _maxBytes: Int,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("saveEntry", onError)

    fun loadEntry(
        _key: String, onSuccess: (Map<String, Any?>?) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("loadEntry", onError)

    fun deleteEntry(
        _key: String, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("deleteEntry", onError)

    fun listKeys(
        onSuccess: (List<String>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("listKeys", onError)

    fun syncStorage(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("syncStorage", onError)

    fun getStorageQuota(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("getStorageQuota", onError)

    fun clearLocalCache(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("clearLocalCache", onError)
}
