package com.margelo.nitro.expopico.notifications

import com.margelo.nitro.core.Callback
import com.margelo.nitro.core.callAndForget
import com.margelo.nitro.core.Promise
import com.pico.pps.sdk.push.IPPSPushClient
import com.pico.pps.sdk.push.IPPSPushMsgReceiver
import com.pico.pps.sdk.push.IRegisterPPSPushCallback
import com.pico.pps.sdk.push.IUnregisterPPSPushCallback
import com.pico.pps.sdk.push.Message
import com.pico.pps.sdk.push.RevokeMsg
import com.pico.pps.sdk.push.PPSPushClient

/**
 * `PicoNotifications` backed by `com.pico.pps:platform-service-push`.
 *
 * Push is the one service whose Kotlin surface is not `Task`-based:
 * `IPPSPushClient.register` takes a plain callback with `onSuccess(token)`
 * and `onFailed(code, message)`, so this file bridges callbacks to
 * Promises directly rather than going through `PicoPps.bridge`.
 *
 * Registration yields a token; delivery needs `setPushMsgReceiver`. Both are
 * wired now. PPS accepts exactly one receiver, so this class installs a single
 * one on the first listener and removes it when the last listener goes, fanning
 * out to JS listeners in between.
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
   * PPS exposes no permission query; push on PICO OS is gated by the normal
   * Android POST_NOTIFICATIONS permission, so that is what is read, live, on
   * every call.
   */
  override fun getPermissionStatus(): NotificationPermissionStatus = NotificationPermission.status()

  override fun requestPermissions(): Promise<NotificationPermissionResult> =
    NotificationPermission.request()

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

  // PPS takes one receiver for the whole client, so listeners are multiplexed
  // here. Ids are handed out across both maps from one counter, which is what
  // lets `removeListener(id)` take a bare id without the caller tracking which
  // kind of listener it was.
  private val messageListeners = mutableMapOf<Double, Callback<(PicoPushMessage) -> Unit>>()
  private val revocationListeners = mutableMapOf<Double, Callback<(PicoPushRevocation) -> Unit>>()
  private var listenerCounter: Double = 0.0
  private var receiverInstalled = false

  private val receiver = object : IPPSPushMsgReceiver {
    override fun onPushMessage(message: Message) {
      val payload = PicoPushMessage(
        msgId = message.msgId.orEmpty(),
        data = message.data.orEmpty(),
      )
      messageListeners.values.toList().forEach { it.callAndForget(payload) }
    }

    override fun onRevokeMsg(revokeMsg: RevokeMsg) {
      val payload = PicoPushRevocation(
        msgId = revokeMsg.msgId.orEmpty(),
        revokeId = revokeMsg.revokeId.orEmpty(),
        revokeData = revokeMsg.revokeData.orEmpty(),
      )
      revocationListeners.values.toList().forEach { it.callAndForget(payload) }
    }
  }

  private fun nextListenerId(): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  /** Installs the single PPS receiver on first use; a no-op afterwards. */
  private fun ensureReceiver() {
    if (receiverInstalled) return
    val push = client ?: return
    runCatching { push.setPushMsgReceiver(receiver) }
      .onSuccess { receiverInstalled = true }
  }

  /** Drops the PPS receiver once nothing is listening. */
  private fun releaseReceiverIfIdle() {
    if (!receiverInstalled) return
    if (messageListeners.isNotEmpty() || revocationListeners.isNotEmpty()) return
    val push = client ?: return
    runCatching { push.removePushMsgReceiver() }
    receiverInstalled = false
  }

  override fun addPushMessageListener(listener: Callback<(message: PicoPushMessage) -> Unit>): Double {
    val id = nextListenerId()
    messageListeners[id] = listener
    ensureReceiver()
    return id
  }

  override fun addPushRevocationListener(
    listener: Callback<(revocation: PicoPushRevocation) -> Unit>
  ): Double {
    val id = nextListenerId()
    revocationListeners[id] = listener
    ensureReceiver()
    return id
  }

  override fun removeListener(id: Double) {
    messageListeners.remove(id)
    revocationListeners.remove(id)
    releaseReceiverIfIdle()
  }

  /**
   * Releases the token. `unRegister` reports through a callback rather than a
   * `Task`, same as `register`.
   */
  override fun unregisterForPushNotifications(): Promise<Unit> {
    val push = client
      ?: return Promise.rejected(PicoPps.unavailable("unregisterForPushNotifications"))
    val promise = Promise<Unit>()
    try {
      push.unRegister(
        object : IUnregisterPPSPushCallback {
          override fun onSuccess() {
            promise.resolve(Unit)
          }

          override fun onFailed(code: String, message: String) {
            promise.reject(
              IllegalStateException("push unregistration failed ($code): $message")
            )
          }
        },
      )
    } catch (t: Throwable) {
      promise.reject(t)
    }
    return promise
  }

  // Nitro V1: the spec bridge reads this Companion (backs JS `new PicoNotifications()`).
  companion object : HybridPicoNotificationsSpec.Companion {
    override fun constructor(): HybridPicoNotifications = HybridPicoNotifications()

    /** Kept in step with `PPS_VERSION` in `plugin/src/ppsArtifacts.ts`. */
    const val PPS_VERSION = "1.0.0"
  }
}
