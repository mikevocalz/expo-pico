package expo.modules.pico.account

/**
 * AccountBridge isolates all PICO Platform SDK account calls.
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * See: https://developer.picoxr.com/document/unity/account/
 */
internal object AccountBridge {

    fun getUserProfile(
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   PlatformSDK.getInstance().getUserInfo { result ->
        //     if (result.isSuccess) onSuccess(mapOf(
        //       "userId"      to result.user.id,
        //       "displayName" to result.user.displayName,
        //       "avatarUrl"   to result.user.avatarUrl,
        //       "isPicoDevice" to AccountUtils.isPicoDevice()
        //     ))
        //     else onError("UNKNOWN", result.errorMessage ?: "getUserProfile failed")
        //   }
        onError("NOT_IMPLEMENTED", "getUserProfile: Account SDK not yet linked.")
    }

    fun getAccountLinkStatus(
        onSuccess: (String) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   PlatformSDK.getInstance().getAccountLinkStatus { result ->
        //     if (result.isSuccess) onSuccess(result.status.name.lowercase())
        //     else onError("UNKNOWN", result.errorMessage ?: "getAccountLinkStatus failed")
        //   }
        onError("NOT_IMPLEMENTED", "getAccountLinkStatus: Account SDK not yet linked.")
    }
}
