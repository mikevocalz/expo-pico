package expo.modules.pico.rtc

/**
 * PPS 1.0.x has NO RTC client. PICO removed the PVR RTC engine during the
 * PVR→PPS rewrite. The example app uses `@fishjam-cloud/react-native-webrtc`
 * for cross-platform RTC instead — that path doesn't go through this bridge.
 *
 * This module is kept as a typed seam so future PPS releases can wire a
 * real `PicoRtcClient` without breaking the JS API. Until then every
 * call returns `NOT_IN_PPS_1_0`.
 */
internal object RtcBridge {

    private fun notInPps(method: String, onError: (String, String) -> Unit) {
        onError(
            "NOT_IN_PPS_1_0",
            "$method is not in PPS 1.0.x. PICO removed dedicated RTC during " +
            "the PVR→PPS rewrite. Use `@fishjam-cloud/react-native-webrtc` " +
            "or another WebRTC stack."
        )
    }

    fun initRtcEngine(
        _options: Map<String, Any?>, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("initRtcEngine", onError)

    fun joinChannel(
        _channelId: String, _token: String, _uid: Int,
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("joinChannel", onError)

    fun leaveChannel(
        onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("leaveChannel", onError)

    fun muteLocalAudio(
        _muted: Boolean, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("muteLocalAudio", onError)

    fun setAudioOutputVolume(
        _volume: Int, onSuccess: (Map<String, Any?>) -> Unit, onError: (String, String) -> Unit
    ) = notInPps("setAudioOutputVolume", onError)
}
