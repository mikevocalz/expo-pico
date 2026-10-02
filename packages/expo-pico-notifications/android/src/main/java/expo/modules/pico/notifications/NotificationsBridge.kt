package expo.modules.pico.notifications

import expo.modules.pico.PicoAppContext
import expo.modules.pico.PicoPlatformSDK

/**
 * PPS 1.0.x push uses a callback-style API (not Tasks):
 *
 *   IPPSPushClient.register(appId, fcmToken, IRegisterPPSPushCallback)
 *     callback.onSuccess(String token) | onFailed(String code, String msg)
 *
 * Factory is `PPSPushClient.getClientImpl(ctx)` — NOT `getPushClient`.
 */
internal object NotificationsBridge {
    private val CLIENT_CLASS = "com.pico.pps.sdk.push.PPSPushClient"
    private val CALLBACK_CLASS = "com.pico.pps.sdk.push.IRegisterPPSPushCallback"

    private inline fun ctx(onError: (String, String) -> Unit, block: (android.content.Context) -> Unit) {
        PicoAppContext.get()?.let(block) ?: onError("NO_CONTEXT", "PicoAppContext not initialized")
    }

    fun requestPermissions(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) {
        // PPS push doesn't expose a Tasks-style permission API on PICO devices —
        // notification permission is granted by the OS at app launch. Surface a
        // synthetic "granted" result so consumers can complete the round-trip.
        onSuccess(mapOf("granted" to true, "status" to "granted"))
    }

    fun registerForPushNotifications(
        appId: String,
        fcmToken: String,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) = ctx(onError) { c ->
        try {
            val factoryClass = Class.forName(CLIENT_CLASS)
            val clientObj = factoryClass.getDeclaredMethod("getClientImpl", android.content.Context::class.java)
                .also { it.isAccessible = true }
                .invoke(null, c)
                ?: return@ctx onError("SDK_UNAVAILABLE", "PPSPushClient.getClientImpl returned null")
            val callbackInterface = Class.forName(CALLBACK_CLASS)
            val proxy = java.lang.reflect.Proxy.newProxyInstance(
                clientObj.javaClass.classLoader,
                arrayOf(callbackInterface),
            ) { _, m, args ->
                try {
                    when (m.name) {
                        "onSuccess" -> {
                            val token = args?.firstOrNull() as? String ?: ""
                            onSuccess(mapOf<String, Any?>("token" to token))
                        }
                        "onFailed", "onFailure", "onError" -> {
                            val code = args?.getOrNull(0)?.toString() ?: "PUSH_REGISTER_FAILED"
                            val msg = args?.getOrNull(1)?.toString() ?: "unknown"
                            onError(code, msg)
                        }
                    }
                } catch (t: Throwable) {
                    onError("CALLBACK_PARSE", "${t.javaClass.simpleName}: ${t.message}")
                }
                null
            }
            val method = clientObj.javaClass.getMethod(
                "register", String::class.java, String::class.java, callbackInterface
            )
            method.invoke(clientObj, appId, fcmToken, proxy)
        } catch (t: Throwable) {
            onError("INVOKE_FAILED", "${t.javaClass.simpleName}: ${t.message}")
        }
    }
}
