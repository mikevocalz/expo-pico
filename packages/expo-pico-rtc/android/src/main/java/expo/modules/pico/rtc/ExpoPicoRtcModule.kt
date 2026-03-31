package expo.modules.pico.rtc

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

/**
 * Expo Module for PICO RTC (real-time voice communication) APIs.
 *
 * Event names emitted by this module (when SDK is bound):
 *   - "onRtcUserJoined"  → { uid: Int, channelId: String, elapsed: Int }
 *   - "onRtcUserLeft"    → { uid: Int, channelId: String, reason: String }
 *   - "onRtcStateChange" → { state: String, reason: String }
 *
 * @see https://developer.picoxr.com/document/ue4/rtc/
 */
class ExpoPicoRtcModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoRtc")

        Events("onRtcUserJoined", "onRtcUserLeft", "onRtcStateChange")

        Constants(
            "rtcSdkAvailable" to RtcUtils.isRtcSdkAvailable(),
            "rtcSdkVersion"   to (RtcUtils.getRtcSdkVersion() ?: "unavailable")
        )

        // options: Map<String, Any?> — { appId, audioScenario }
        AsyncFunction("initRtcEngine") { options: Map<String, Any?>, promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            RtcBridge.initRtcEngine(options,
                onSuccess = { promise.resolve(null) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        AsyncFunction("joinChannel") { channelId: String, token: String, uid: Int, promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            RtcBridge.joinChannel(channelId, token, uid,
                onSuccess = { result -> promise.resolve(result) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        AsyncFunction("leaveChannel") { promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            RtcBridge.leaveChannel(
                onSuccess = { promise.resolve(null) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        AsyncFunction("muteLocalAudio") { muted: Boolean, promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            RtcBridge.muteLocalAudio(muted,
                onSuccess = { promise.resolve(null) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }

        AsyncFunction("setAudioOutputVolume") { volume: Int, promise: Promise ->
            guardAvailability(promise) { return@AsyncFunction }
            RtcBridge.setAudioOutputVolume(volume,
                onSuccess = { promise.resolve(null) },
                onError   = { code, msg -> promise.reject(code, msg, null) }
            )
        }
    }

    internal fun emitUserJoined(uid: Int, channelId: String, elapsed: Int) {
        sendEvent("onRtcUserJoined", mapOf(
            "uid"       to uid,
            "channelId" to channelId,
            "elapsed"   to elapsed
        ))
    }

    internal fun emitUserLeft(uid: Int, channelId: String, reason: String) {
        sendEvent("onRtcUserLeft", mapOf(
            "uid"       to uid,
            "channelId" to channelId,
            "reason"    to reason
        ))
    }

    internal fun emitStateChange(state: String, reason: String) {
        sendEvent("onRtcStateChange", mapOf(
            "state"  to state,
            "reason" to reason
        ))
    }

    private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
        if (!RtcUtils.isRtcSdkAvailable()) {
            promise.reject("SERVICE_UNAVAILABLE", "RTC SDK not available on this build", null)
            earlyReturn()
        }
    }
}
