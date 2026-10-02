package expo.modules.pico.account

import com.bytedance.pico.matrix.proto.v2.AUTH_TYPE
import com.bytedance.pico.matrix.proto.v2.AdultStatus
import com.bytedance.pico.matrix.proto.v2.AuthScopeRequest
import com.bytedance.pico.matrix.proto.v2.SignInRequest
import com.pico.pps.sdk.auth.ISignInClient
import com.pico.pps.sdk.auth.PicoSignInClient
import com.pico.pps.sdk.base.MatrixResult
import com.pico.pps.sdk.base.OnCancelListener
import com.pico.pps.sdk.base.OnFailureListener
import com.pico.pps.sdk.base.OnSuccessListener
import com.pico.pps.sdk.base.Task
import expo.modules.pico.PicoAppContext

/**
 * Thin Expo Modules v2 adapter over PICO Platform Service auth.
 *
 * This intentionally stays Kotlin: PPS is a Java/Kotlin AAR API. Moving it
 * through Eskiu would add JNI hops instead of reducing them.
 */
internal object AccountBridge {
    private fun client(): ISignInClient? {
        val context = PicoAppContext.get() ?: return null
        return runCatching { PicoSignInClient.getSignInClient(context) }.getOrNull()
    }

    private fun unavailable(method: String, onError: (String, String) -> Unit) {
        onError(
            "SERVICE_UNAVAILABLE",
            "$method requires PICO Platform Service auth on a PICO build"
        )
    }

    private fun <T, R> Task<T>.bridge(
        label: String,
        onSuccess: (R) -> Unit,
        onError: (String, String) -> Unit,
        transform: (T) -> R,
    ) {
        addOnSuccessListener(object : OnSuccessListener<T> {
            override fun onSuccess(result: MatrixResult<T>) {
                try {
                    if (!result.isSuccess()) {
                        val info = result.errorInfo
                        val code = info?.errorCode?.toString() ?: "PPS_ERROR"
                        val message = buildString {
                            append(label).append(" failed")
                            if (!info?.errorMsg.isNullOrEmpty()) append(": ").append(info?.errorMsg)
                            if (!info?.logId.isNullOrEmpty()) append(" [logId ").append(info?.logId).append("]")
                        }
                        onError(code, message)
                        return
                    }
                    val data = result.data
                    if (data == null) {
                        onError("EMPTY_RESULT", "$label returned no data")
                        return
                    }
                    onSuccess(transform(data))
                } catch (t: Throwable) {
                    onError("PPS_BRIDGE_ERROR", t.message ?: "$label failed")
                }
            }
        })
        addOnFailureListener(object : OnFailureListener {
            override fun onFailure(e: Exception) {
                onError("PPS_FAILURE", e.message ?: "$label failed")
            }
        })
        addOnCancelListener(object : OnCancelListener {
            override fun onCancel() {
                onError("CANCELLED", "$label was cancelled")
            }
        })
    }

    fun getUserProfile(
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("getUserProfile", onError)
        @Suppress("DEPRECATION")
        signIn.getUserInfo().bridge("getUserProfile", onSuccess, onError) { response ->
            val user = response.loginUser
                ?: throw IllegalStateException("NOT_SIGNED_IN: no user is signed in")
            mapOf(
                "userId" to user.openUid.orEmpty(),
                "displayName" to user.displayName.orEmpty(),
                "avatarUrl" to user.avatarUrl,
            )
        }
    }

    fun getAccountLinkStatus(
        onSuccess: (String) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // PPS has no account-link-status endpoint. Preserve the explicit
        // unsupported state rather than guessing from OAuth scopes.
        if (client() == null) return unavailable("getAccountLinkStatus", onError)
        onSuccess("unsupported")
    }

    fun getAccessToken(
        onSuccess: (String) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("getAccessToken", onError)
        @Suppress("DEPRECATION")
        signIn.getAccessToken().bridge("getAccessToken", onSuccess, onError) { response ->
            response.accessToken
                ?: throw IllegalStateException("NOT_SIGNED_IN: no access token is available")
        }
    }

    fun login(
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("login", onError)
        val request = SignInRequest(emptyList(), AUTH_TYPE.ACCESS_TOKEN)
        signIn.signIn(request).bridge("login", onSuccess, onError) { response ->
            mapOf(
                "status" to "success",
                "userId" to response.userInfo?.openUid,
                "accessToken" to response.accessToken,
                "code" to response.authCode,
                "message" to null,
            )
        }
    }

    fun logout(
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("logout", onError)
        signIn.signOut().bridge("logout", { onSuccess() }, onError) { Unit }
    }

    fun getAdultStatus(
        onSuccess: (String) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("getAdultStatus", onError)
        signIn.isAdult().bridge("getAdultStatus", onSuccess, onError) { response ->
            when (response.adultStatus) {
                AdultStatus.ADULT -> "adult"
                AdultStatus.MINOR -> "minor"
                else -> "unknown"
            }
        }
    }

    fun getAuthorizedScopes(
        onSuccess: (List<String>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("getAuthorizedScopes", onError)
        signIn.getAuthorizedScopes().bridge("getAuthorizedScopes", onSuccess, onError) { response ->
            response.authorizedScopes.orEmpty()
        }
    }

    fun requestAuthScopes(
        scopes: List<String>,
        onSuccess: (List<String>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("requestAuthScopes", onError)
        signIn.requestAuthScopes(scopes).bridge("requestAuthScopes", onSuccess, onError) { response ->
            response.authorizedScopes.orEmpty()
        }
    }

    fun cancelAuthorization(
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("cancelAuthorization", onError)
        signIn.cancelAuthorization().bridge("cancelAuthorization", { onSuccess() }, onError) { Unit }
    }

    fun sendAuthScopesRequest(
        scopes: List<String>,
        authType: String,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val signIn = client() ?: return unavailable("sendAuthScopesRequest", onError)
        val ppsAuthType = when (authType) {
            "auth-code" -> AUTH_TYPE.AUTH_CODE
            "id-token" -> AUTH_TYPE.ID_TOKEN
            else -> AUTH_TYPE.ACCESS_TOKEN
        }
        val request = AuthScopeRequest(scopes, ppsAuthType)
        signIn.sendAuthScopesRequest(request).bridge("sendAuthScopesRequest", onSuccess, onError) { response ->
            mapOf(
                "authorizedScopes" to response.authorizedScopeList.orEmpty(),
                "accessToken" to response.accessToken.orEmpty(),
                "refreshToken" to response.refreshToken.orEmpty(),
                "idToken" to response.idToken.orEmpty(),
                "authCode" to response.authCode.orEmpty(),
                "userId" to response.userInfo?.openUid.orEmpty(),
                "displayName" to response.userInfo?.displayName.orEmpty(),
            )
        }
    }
}
