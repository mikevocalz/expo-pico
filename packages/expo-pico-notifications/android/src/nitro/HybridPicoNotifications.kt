package com.margelo.nitro.expopico.notifications

import com.margelo.nitro.core.Promise
import com.pico.pps.sdk.push.IPPSPushClient
import com.pico.pps.sdk.push.IRegisterPPSPushCallback
import com.pico.pps.sdk.push.PPSPushClient

/**
 * `PicoNotifications` backed by `com.pico.pps:platform-service-push`.
 *
 * Push is the one service whose Kotlin surface is not `Task`-based:
 * `IPPSPushClient.register` takes a plain callback with `onSuccess(token)`
 * and `onFailed(code, message)`, so this file bridges callbacks to
 * Promises directly rather than going through `PicoPps.bridge`.
 *
 * Registration yields a token and nothing more. Actually *receiving* a
 * message needs `setPushMsgReceiver(IPPSPushMsgReceiver)`, which this
 * package does not expose — the generated spec has no receiver surface, so
 * wiring it here would have nowhere to deliver to. That gap is recorded in
 * `docs/PPS-WIRING-GAPS.md` and needs a spec change, not just Kotlin.
 */
class HybridPicoNotifications : HybridPicoNotificationsSpec() {

  private val client: IPPSPushClient?
    get() {
      if (!PicoPps.sdkPresent) return null
      val context = PicoPps.context() ?: return null
      return try {
        PPSPushClient.getClientImpl(context)
      } catch (_: Throwable) {
        null
      }
    }

  override val available: Boolean
    get() = client != null

  override val sdkVersion: String
    get() = if (PicoPps.sdkPresent) PPS_VERSION else ""

  /**
   * PPS exposes no permission query, and PICO OS grants push to an app
   * that registers successfully rather than through a runtime prompt. So
   * the honest answer before a registration attempt is "not determined" —
   * claiming `GRANTED` would be asserting something never checked.
   */
  override val permissionStatus: NotificationPermissionStatus
    get() = if (client == null) {
      NotificationPermissionStatus.DENIED
    } else {
      NotificationPermissionStatus.NOT_DETERMINED
    }

  /**
   * There is no permission dialog to raise on PICO, so this reports the
   * current state with `prompted = false` rather than pretending a prompt
   * was shown. Callers that need a definitive answer should register.
   */
  override fun requestPermissions(): Promise<NotificationPermissionResult> =
    Promise.resolved(
      NotificationPermissionResult(
        status = permissionStatus,
        prompted = false,
      )
    )

  override fun registerForPushNotifications(): Promise<NotificationToken> {
    val push = client
      ?: return Promise.rejected(PicoPps.unavailable("registerForPushNotifications"))
    val promise = Promise<NotificationToken>()
    try {
      // The two string arguments are the app's push channel identifiers.
      // PPS reads them from the manifest metadata that expo-pico-core's
      // plugin writes, so empty strings mean "use what is configured"
      // rather than "unset".
      push.register(
        "",
        "",
        object : IRegisterPPSPushCallback {
          override fun onSuccess(token: String) {
            promise.resolve(
              NotificationToken(
                token = token,
                provider = NotificationProvider.PICO,
                registeredAtMs = System.currentTimeMillis().toDouble(),
              )
            )
          }

          override fun onFailed(code: String, message: String) {
            promise.reject(
              IllegalStateException("push registration failed ($code): $message")
            )
          }
        },
      )
    } catch (t: Throwable) {
      promise.reject(t)
    }
    return promise
  }

  private companion object {
    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"
  }
}
