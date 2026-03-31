package expo.modules.pico.rtc

/**
 * RtcBridge isolates all PICO RTC SDK calls.
 *
 * Threading: All functions called from AsyncFunction background threads.
 *
 * When PICO RTC SDK AAR is available:
 *   - Replace each TODO(pico-sdk) block only in this file
 *   - Register engine callbacks in initRtcEngine to call moduleRef.emitXxx(...)
 *
 * See: https://developer.picoxr.com/document/ue4/rtc/
 */
internal object RtcBridge {

    @Volatile
    var moduleRef: ExpoPicoRtcModule? = null

    fun initRtcEngine(
        options: Map<String, Any?>,
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   val appId = options["appId"] as? String ?: BuildConfig.PICO_APP_ID
        //   val scenario = options["audioScenario"] as? String ?: "default"
        //   RtcEngine.create(appId, scenario) { engine ->
        //     engine.setEventHandler(object : IRtcEngineEventHandler() {
        //       override fun onUserJoined(uid: Int, elapsed: Int) {
        //         moduleRef?.emitUserJoined(uid, currentChannelId, elapsed)
        //       }
        //       override fun onUserOffline(uid: Int, reason: Int) {
        //         moduleRef?.emitUserLeft(uid, currentChannelId, reasonToString(reason))
        //       }
        //       override fun onConnectionStateChanged(state: Int, reason: Int) {
        //         moduleRef?.emitStateChange(stateToString(state), reason.toString())
        //       }
        //     })
        //     onSuccess()
        //   }
        onError("NOT_IMPLEMENTED", "initRtcEngine: RTC SDK not yet linked.")
    }

    fun joinChannel(
        channelId: String,
        token: String,
        uid: Int,
        onSuccess: (Map<String, Any?>) -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   val code = engine.joinChannel(token, channelId, "", uid)
        //   if (code == 0) onSuccess(mapOf("status" to "joined", "channelId" to channelId, "uid" to uid))
        //   else onError("UNKNOWN", "joinChannel failed with code $code")
        onError("NOT_IMPLEMENTED", "joinChannel: RTC SDK not yet linked.")
    }

    fun leaveChannel(
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk):
        //   val code = engine.leaveChannel()
        //   if (code == 0) onSuccess() else onError("UNKNOWN", "leaveChannel failed with code $code")
        onError("NOT_IMPLEMENTED", "leaveChannel: RTC SDK not yet linked.")
    }

    fun muteLocalAudio(
        muted: Boolean,
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk): engine.muteLocalAudioStream(muted); onSuccess()
        onError("NOT_IMPLEMENTED", "muteLocalAudio: RTC SDK not yet linked.")
    }

    fun setAudioOutputVolume(
        volume: Int,
        onSuccess: () -> Unit,
        onError: (String, String) -> Unit,
    ) {
        // TODO(pico-sdk): engine.adjustPlaybackSignalVolume(volume.coerceIn(0, 100)); onSuccess()
        onError("NOT_IMPLEMENTED", "setAudioOutputVolume: RTC SDK not yet linked.")
    }
}
