package expo.modules.pico.account

import expo.modules.pico.PicoAppContext
import expo.modules.pico.PicoPlatformSDK

/**
 * AccountBridge routes through [PicoPlatformSDK] reflection.
 *
 * Wired to the PICO Platform Service SDK 3.x Tasks-style API:
 *
 *   PicoSignInClient.getSignInClient(context)
 *       .getUserInfo()
 *       .addOnSuccessListener { result: MatrixResult<GetCurrentOpenUserInfoResponse> -> ... }
 *
 * Verified against https://developer.picoxr.com/reference/platform_service/latest/account-api/
 *
 * PPS is wired by default on `picoDebug` builds — `@expo-pico/core`'s
 * `withPicoGradle` adds `com.pico.pps:platform-service-auth:1.0.0` from
 * the public Bytedance Maven, so `PicoSignInClient` is on the classpath
 * with no AAR drop. Calls return `SDK_UNAVAILABLE` only on the mobile
 * flavor, on non-PICO hardware, or if Gradle could not reach the Maven
 * repo at build time.
 */
internal object AccountBridge {

    // PicoSignInClient (com.pico.pps.sdk.auth.*) — modern PPS SDK, pulled
    // from public Maven by withPicoGradle. The legacy callback-style
    // PlatformSDK is kept as a fallback for older PVR-prefixed SDK variants.
    private val CLIENT = arrayOf(
        "com.pico.pps.sdk.auth.PicoSignInClient",
        "com.pvr.platform.sdk.PlatformSDK",
    )
    private val FACTORY = arrayOf("getSignInClient", "getClient", "getInstance")

    fun getUserProfile(
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("getUserInfo", "getCurrentUser", "getMe"),
            args = arrayOf<Any?>(),
            mapResult = { raw ->
                val response = if (raw is Map<*, *>) {
                    @Suppress("UNCHECKED_CAST") raw as Map<String, Any?>
                } else PicoPlatformSDK.objectToMap(raw) ?: emptyMap()
                // GetCurrentOpenUserInfoResponse.loginUser : OpenUserInfo
                val loginUser = (response["loginUser"] as? Map<*, *>)?.let {
                    @Suppress("UNCHECKED_CAST") it as Map<String, Any?>
                } ?: response  // fall back to flat shape if the field is missing
                mapOf<String, Any?>(
                    "userId" to (loginUser["openUid"] ?: loginUser["openId"] ?: loginUser["userId"] ?: loginUser["accountId"] ?: loginUser["picoId"]),
                    "displayName" to (loginUser["displayName"] ?: loginUser["nickName"] ?: loginUser["nickname"] ?: loginUser["userName"]),
                    "avatarUrl" to (loginUser["avatarUrl"] ?: loginUser["headImage"] ?: loginUser["smallImageUrl"] ?: loginUser["avatar"]),
                    "accessToken" to loginUser["accessToken"],
                    "storeRegion" to loginUser["storeRegion"],
                    "isPicoDevice" to AccountUtils.isPicoDevice(),
                )
            },
            onSuccess = { onSuccess(it) },
            onError = onError,
        )
    }

    fun getAccountLinkStatus(
        onSuccess: (String) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // The signed-in user IS a linked PVR account on PICO; we report
        // "linked" when getUserInfo returns a non-null openId.
        getUserProfile(
            onSuccess = { profile -> onSuccess(if (profile["userId"] != null) "linked" else "unlinked") },
            onError = onError,
        )
    }

    // ISignInClient.getAccessToken() → Task<GetAccessTokenResponse>
    fun getAccessToken(
        onSuccess: (String) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("getAccessToken"),
            args = arrayOf<Any?>(),
            mapResult = { raw ->
                val asMap = if (raw is Map<*, *>) {
                    @Suppress("UNCHECKED_CAST") raw as Map<String, Any?>
                } else PicoPlatformSDK.objectToMap(raw) ?: emptyMap()
                (asMap["accessToken"] ?: asMap["token"] ?: "").toString()
            },
            onSuccess = onSuccess,
            onError = onError,
        )
    }

    // ISignInClient.signOut() → Task<Unit>
    fun logout(
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("signOut", "logout"),
            args = arrayOf<Any?>(),
            mapResult = { Unit },
            onSuccess = { onSuccess() },
            onError = onError,
        )
    }

    // ISignInClient.signIn(SignInRequest) → Task<SignInResponse>
    // SignInRequest is a Wire proto: prefer Builder over ctor (resilient
    // across proto regenerations; ctor arity drifts when fields are added).
    fun login(
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val ctx = PicoAppContext.get() ?: return onError("NO_CONTEXT", "PicoAppContext not initialized")
        val req = try { buildSignInRequest() }
        catch (t: Throwable) {
            return onError("SDK_SCHEMA", "Could not construct SignInRequest: ${t.javaClass.simpleName}: ${t.message}")
        }
        PicoPlatformSDK.callTask(
            context = ctx,
            clientCandidates = CLIENT,
            factoryNameCandidates = FACTORY,
            methodCandidates = arrayOf("signIn", "login"),
            args = arrayOf<Any?>(req),
            mapResult = { raw ->
                val response = if (raw is Map<*, *>) {
                    @Suppress("UNCHECKED_CAST") raw as Map<String, Any?>
                } else PicoPlatformSDK.objectToMap(raw) ?: emptyMap()
                val loginUser = (response["loginUser"] as? Map<*, *>)?.let {
                    @Suppress("UNCHECKED_CAST") it as Map<String, Any?>
                } ?: response
                mapOf<String, Any?>(
                    "userId" to (loginUser["openUid"] ?: loginUser["openId"] ?: loginUser["userId"]),
                    "displayName" to loginUser["displayName"],
                    "avatarUrl" to (loginUser["avatarUrl"] ?: loginUser["headImage"] ?: loginUser["smallImageUrl"]),
                    "accessToken" to (loginUser["accessToken"] ?: response["accessToken"]),
                )
            },
            onSuccess = onSuccess,
            onError = onError,
        )
    }

    private fun buildSignInRequest(): Any {
        val reqClass = Class.forName("com.bytedance.pico.matrix.proto.v2.SignInRequest")
        // AUTH_TYPE is an enum at com.bytedance.pico.matrix.proto.v2.AUTH_TYPE.
        // SignInRequest.DEFAULT_AUTHTYPE is a static of that enum's type.
        val authTypeClass = Class.forName("com.bytedance.pico.matrix.proto.v2.AUTH_TYPE")
        val defaultAuthType = reqClass.getDeclaredField("DEFAULT_AUTHTYPE").get(null)
        // PICO PPS rejects "openid" (OAuth-std) with 100004 (invalid scope).
        // Empty list is accepted because the PICO OS user is already signed
        // in at app-launch — signIn becomes a no-op confirmation of identity.
        val scopes = emptyList<String>()
        // Prefer Builder if present (Wire proto pattern); fall back to ctor.
        return try {
            val builderClass = Class.forName("com.bytedance.pico.matrix.proto.v2.SignInRequest\$Builder")
            val builder = builderClass.getDeclaredConstructor().newInstance()
            builderClass.getMethod("scopeList", java.util.List::class.java).invoke(builder, scopes)
            builderClass.getMethod("authType", authTypeClass).invoke(builder, defaultAuthType)
            builderClass.getDeclaredMethod("build").invoke(builder)
        } catch (_: Throwable) {
            reqClass.getDeclaredConstructor(java.util.List::class.java, authTypeClass)
                .newInstance(scopes, defaultAuthType)
        }
    }
}
