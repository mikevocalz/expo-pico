package expo.modules.pico.notifications

import com.pico.pps.sdk.push.IPPSPushClient
import com.pico.pps.sdk.push.IPPSPushMsgReceiver
import com.pico.pps.sdk.push.IRegisterPPSPushCallback
import com.pico.pps.sdk.push.IUnregisterPPSPushCallback
import com.pico.pps.sdk.push.Message
import com.pico.pps.sdk.push.PPSPushClient
import com.pico.pps.sdk.push.RevokeMsg
import expo.modules.pico.PicoAppContext

internal object NotificationsBridge {
    private fun client(): IPPSPushClient? {
        val context = PicoAppContext.get() ?: return null
        return runCatching { PPSPushClient.getClientImpl(context) }.getOrNull()
    }

    fun permissionStatus(): String =
        if (client() == null) "denied" else "not-determined"

    fun requestPermissions(
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        if (client() == null) {
            onError("SERVICE_UNAVAILABLE", "PICO push service is unavailable")
            return
        }
        onSuccess(mapOf("status" to permissionStatus(), "prompted" to false))
    }

    fun registerForPushNotifications(
        appId: String,
        fcmToken: String,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val push = client()
            ?: return onError("SERVICE_UNAVAILABLE", "PICO push service is unavailable")
        try {
            push.register(
                appId,
                fcmToken,
                object : IRegisterPPSPushCallback {
                    override fun onSuccess(token: String) {
                        onSuccess(
                            mapOf(
                                "token" to token,
                                "provider" to "pico",
                                "registeredAtMs" to System.currentTimeMillis().toDouble(),
                            )
                        )
                    }

                    override fun onFailed(code: String, message: String) {
                        onError(code, message)
                    }
                },
            )
        } catch (t: Throwable) {
            onError("PUSH_REGISTER_FAILED", t.message ?: "Push registration failed")
        }
    }

    fun unregisterForPushNotifications(
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        val push = client()
            ?: return onError("SERVICE_UNAVAILABLE", "PICO push service is unavailable")
        try {
            push.unRegister(
                object : IUnregisterPPSPushCallback {
                    override fun onSuccess() = onSuccess()

                    override fun onFailed(code: String, message: String) {
                        onError(code, message)
                    }
                },
            )
        } catch (t: Throwable) {
            onError("PUSH_UNREGISTER_FAILED", t.message ?: "Push unregistration failed")
        }
    }

    private var receiverInstalled = false

    private val receiver = object : IPPSPushMsgReceiver {
        override fun onPushMessage(message: Message) {
            onMessage?.invoke(
                mapOf(
                    "msgId" to message.msgId.orEmpty(),
                    "data" to message.data.orEmpty(),
                )
            )
        }

        override fun onRevokeMsg(revokeMsg: RevokeMsg) {
            onRevocation?.invoke(
                mapOf(
                    "msgId" to revokeMsg.msgId.orEmpty(),
                    "revokeId" to revokeMsg.revokeId.orEmpty(),
                    "revokeData" to revokeMsg.revokeData.orEmpty(),
                )
            )
        }
    }

    private var onMessage: ((Map<String, Any?>) -> Unit)? = null
    private var onRevocation: ((Map<String, Any?>) -> Unit)? = null

    fun startObserving(
        message: (Map<String, Any?>) -> Unit,
        revocation: (Map<String, Any?>) -> Unit,
    ) {
        onMessage = message
        onRevocation = revocation
        if (receiverInstalled) return
        val push = client() ?: return
        runCatching { push.setPushMsgReceiver(receiver) }
            .onSuccess { receiverInstalled = true }
    }

    fun stopObserving() {
        onMessage = null
        onRevocation = null
        if (!receiverInstalled) return
        val push = client()
        runCatching { push?.removePushMsgReceiver() }
        receiverInstalled = false
    }
}
