package com.margelo.nitro.expopico.account

import com.margelo.nitro.core.Promise
import com.pico.pps.sdk.auth.ISignInClient
import com.pico.pps.sdk.auth.PicoSignInClient
import com.pico.pps.sdk.auth.SignInApiAvailableChecker
import com.bytedance.pico.matrix.proto.v2.AdultStatus
import com.bytedance.pico.matrix.proto.v2.AUTH_TYPE
import com.bytedance.pico.matrix.proto.v2.AuthScopeRequest
import com.bytedance.pico.matrix.proto.v2.SignInRequest

/**
 * `PicoAccount` backed by `com.pico.pps:platform-service-auth`.
 *
 * Signatures come from `javap` on the published artifact; see
 * `docs/PPS-API-SURFACE.md`. Two shapes are worth knowing before reading
 * this file:
 *
 * - Payloads are Square Wire protobuf messages, so every field is a
 *   nullable Java reference even where the schema calls it required.
 * - `getUserInfo()` returns the currently signed-in user and fails when
 *   nobody is signed in; it is not a way to test for a session.
 *
 * `getUserInfo()` and `getAccessToken()` both carry `@Deprecated("use
 * signIn or sendAuthScopesRequest")` in the 1.0.0 artifact — the compiler
 * warns on both calls. They still work, and they are the only calls that
 * read an existing session without showing UI, which is what this API
 * needs. Moving to `signIn` would make every profile read capable of
 * presenting an account picker. Revisit when PPS documents what replaces
 * the silent path.
 */
class HybridPicoAccount : HybridPicoAccountSpec() {

  private val client: ISignInClient?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        PicoSignInClient.getSignInClient(context)
      } catch (_: Throwable) {
        null
      }
    }

  private val checker: SignInApiAvailableChecker?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        SignInApiAvailableChecker.getInstance(context)
      } catch (_: Throwable) {
        null
      }
    }

  override val available: Boolean
    get() = client != null

  /**
   * The PPS line this build compiled against.
   *
   * Deliberately the pinned constant rather than something read off the
   * device: `expo-pico-core` pins every `com.pico.pps:*` coordinate to one
   * version, so this is what is actually on the classpath. Reporting a
   * device-side number here would describe the PICO OS service, which is a
   * different thing and is what `sdkStatus` covers.
   */
  override val sdkVersion: String
    get() = if (PicoPps.sdkPresent) PPS_VERSION else ""

  /**
   * Why the service is or is not usable, as a short stable token the JS
   * layer can branch on.
   */
  override val sdkStatus: String
    get() = when {
      !PicoPps.sdkPresent -> "SDK_NOT_LINKED"
      PicoPps.context() == null -> "CONTEXT_UNAVAILABLE"
      client == null -> "CLIENT_UNAVAILABLE"
      checker?.isSignInAvailable == false -> "API_UNAVAILABLE"
      else -> "READY"
    }

  override fun login(): Promise<PicoLoginResult> {
    val signIn = client ?: return Promise.rejected(PicoPps.unavailable("login"))
    // An empty scope list asks for the default set.
    //
    // AUTH_TYPE selects what the response carries back, not a login mode:
    // the artifact declares exactly AUTH_CODE, ACCESS_TOKEN and ID_TOKEN.
    // ACCESS_TOKEN is the one this package needs, because `PicoLoginResult`
    // surfaces `accessToken` and `getAccessToken()` reads the same session.
    val request = SignInRequest(emptyList(), AUTH_TYPE.ACCESS_TOKEN)
    return signIn.signIn(request).bridge("login") { response ->
      PicoLoginResult(
        status = PicoLoginStatus.SUCCESS,
        userId = response.userInfo?.openUid,
        accessToken = response.accessToken,
        code = response.authCode,
        message = null,
      )
    }
  }

  override fun logout(): Promise<Unit> {
    val signIn = client ?: return Promise.rejected(PicoPps.unavailable("logout"))
    return signIn.signOut().bridge("logout") { }
  }

  override fun getUserProfile(): Promise<PicoUserProfile> {
    val signIn = client ?: return Promise.rejected(PicoPps.unavailable("getUserProfile"))
    return signIn.getUserInfo().bridge("getUserProfile") { response ->
      val user = response.loginUser
        ?: throw IllegalStateException("NOT_SIGNED_IN: no user is signed in")
      PicoUserProfile(
        userId = user.openUid.orEmpty(),
        displayName = user.displayName.orEmpty(),
        avatarUrl = user.avatarUrl,
      )
    }
  }

  override fun getAccessToken(): Promise<String> {
    val signIn = client ?: return Promise.rejected(PicoPps.unavailable("getAccessToken"))
    return signIn.getAccessToken().bridge("getAccessToken") { response ->
      response.accessToken
        ?: throw IllegalStateException("NOT_SIGNED_IN: no access token is available")
    }
  }

  /**
   * Account linking has no PPS backing.
   *
   * `ISignInClient` exposes nine methods and none of them returns a link
   * status — see the "Unbacked" table in `docs/PPS-WIRING-GAPS.md`. The
   * TypeScript surface predates that audit. Rather than invent a mapping
   * from `getAuthorizedScopes()` (which answers a different question), this
   * resolves `UNSUPPORTED`, which is a value the enum already carries and
   * which the JS layer already handles.
   */
  /**
   * Age gate.
   *
   * `IsAdultResponse.adultStatus` is `AdultStatus{UNKNOWN, MINOR, ADULT}`.
   * UNKNOWN is carried through rather than folded into either answer: the
   * account simply has not been verified, which is different from being
   * confirmed a minor, and a store-compliance gate needs to tell them apart.
   * A null field maps to UNKNOWN for the same reason.
   */
  override fun getAdultStatus(): Promise<PicoAdultStatus> {
    val signIn = client ?: return Promise.rejected(PicoPps.unavailable("getAdultStatus"))
    return signIn.isAdult().bridge("getAdultStatus") { response ->
      when (response.adultStatus) {
        AdultStatus.ADULT -> PicoAdultStatus.ADULT
        AdultStatus.MINOR -> PicoAdultStatus.MINOR
        else -> PicoAdultStatus.UNKNOWN
      }
    }
  }

  /**
   * Scopes already granted. Empty list when the user has granted none —
   * `authorizedScopes` is a Wire field and so nullable even here.
   */
  override fun getAuthorizedScopes(): Promise<Array<String>> {
    val signIn = client
      ?: return Promise.rejected(PicoPps.unavailable("getAuthorizedScopes"))
    return signIn.getAuthorizedScopes().bridge("getAuthorizedScopes") { response ->
      response.authorizedScopes.orEmpty().toTypedArray()
    }
  }

  /**
   * Requests scopes and resolves with what was actually granted, which may be
   * narrower than what was asked for — the user can decline individually, so
   * the response is the authority rather than the request.
   */
  override fun requestAuthScopes(scopes: Array<String>): Promise<Array<String>> {
    val signIn = client
      ?: return Promise.rejected(PicoPps.unavailable("requestAuthScopes"))
    return signIn.requestAuthScopes(scopes.toList()).bridge("requestAuthScopes") { response ->
      response.authorizedScopes.orEmpty().toTypedArray()
    }
  }

  /**
   * Interactive scope request that also returns credentials.
   *
   * Unlike `requestAuthScopes`, which answers only which scopes were granted,
   * `AuthScopeResponse` carries accessToken / refreshToken / idToken / authCode
   * plus the user. Which of those is populated follows the requested
   * `AUTH_TYPE`; the rest come back empty, so all four are mapped through as
   * empty strings rather than being guessed at here.
   */
  override fun sendAuthScopesRequest(
    scopes: Array<String>,
    authType: PicoAuthType,
  ): Promise<PicoAuthScopeResult> {
    val signIn = client
      ?: return Promise.rejected(PicoPps.unavailable("sendAuthScopesRequest"))
    val ppsAuthType = when (authType) {
      PicoAuthType.AUTH_CODE -> AUTH_TYPE.AUTH_CODE
      PicoAuthType.ID_TOKEN -> AUTH_TYPE.ID_TOKEN
      PicoAuthType.ACCESS_TOKEN -> AUTH_TYPE.ACCESS_TOKEN
    }
    val request = AuthScopeRequest(scopes.toList(), ppsAuthType)
    return signIn.sendAuthScopesRequest(request).bridge("sendAuthScopesRequest") { response ->
      PicoAuthScopeResult(
        authorizedScopes = response.authorizedScopeList.orEmpty().toTypedArray(),
        accessToken = response.accessToken.orEmpty(),
        refreshToken = response.refreshToken.orEmpty(),
        idToken = response.idToken.orEmpty(),
        authCode = response.authCode.orEmpty(),
        userId = response.userInfo?.openUid.orEmpty(),
        displayName = response.userInfo?.displayName.orEmpty(),
      )
    }
  }

  /** Revokes authorization. Returns `Task<Unit>`, so there is nothing to map. */
  override fun cancelAuthorization(): Promise<Unit> {
    val signIn = client
      ?: return Promise.rejected(PicoPps.unavailable("cancelAuthorization"))
    return signIn.cancelAuthorization().bridge("cancelAuthorization") { }
  }

  override fun getAccountLinkStatus(): Promise<PicoAccountLinkStatus> =
    Promise.resolved(PicoAccountLinkStatus.UNSUPPORTED)

  private companion object {
    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"
  }
}
