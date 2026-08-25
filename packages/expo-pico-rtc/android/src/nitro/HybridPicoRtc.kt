package com.margelo.nitro.expopico.rtc

import com.margelo.nitro.core.Promise

/**
 * `PicoRtc` — no PICO Platform Service artifact exists behind it.
 *
 * The Volcengine repo publishes eleven `com.pico.pps:platform-service-*`
 * artifacts. There is no `platform-service-rtc` among them, and no voice
 * channel API on any of the other ten — see the "Confirmed correct"
 * section of `docs/PPS-WIRING-GAPS.md`, which checked this against the
 * published artifacts rather than the documentation.
 *
 * So this is not a stub waiting on a call to be wired: real-time voice is
 * not part of PPS 1.0.x. Every method reports the service as unavailable,
 * which is the contract the TypeScript layer already documents as
 * `NOT_IN_PPS_1_0` and already handles.
 *
 * If PICO ships an RTC artifact, the work is to replace this class — the
 * generated spec, and therefore the JS API, does not have to change.
 */
class HybridPicoRtc : HybridPicoRtcSpec() {

  override val available: Boolean
    get() = false

  override val sdkVersion: String?
    get() = null

  override val status: RtcServiceStatus
    get() = RtcServiceStatus.UNAVAILABLE

  override fun initRtcEngine(options: RtcInitOptions?): Promise<Unit> =
    Promise.rejected(notInPps("initRtcEngine"))

  override fun joinChannel(options: RtcJoinOptions): Promise<RtcJoinResult> =
    Promise.rejected(notInPps("joinChannel"))

  override fun leaveChannel(): Promise<Unit> =
    Promise.rejected(notInPps("leaveChannel"))

  override fun muteLocalAudio(muted: Boolean): Promise<Unit> =
    Promise.rejected(notInPps("muteLocalAudio"))

  override fun setAudioOutputVolume(volume: Double): Promise<Unit> =
    Promise.rejected(notInPps("setAudioOutputVolume"))

  // Listener registration succeeds and returns a real id so that JS
  // subscribe/unsubscribe code is not forced to special-case this package.
  // Nothing is ever emitted, and `removeListener` is honest about that.
  override fun addUserJoinedListener(listener: (event: RtcUserJoinedEvent) -> Unit): Double =
    nextListenerId()

  override fun addUserLeftListener(listener: (event: RtcUserLeftEvent) -> Unit): Double =
    nextListenerId()

  override fun addRtcStateChangeListener(listener: (event: RtcStateChangeEvent) -> Unit): Double =
    nextListenerId()

  override fun removeListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  private fun nextListenerId(): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  private fun notInPps(what: String): Throwable =
    UnsupportedOperationException(
      "NOT_IN_PPS_1_0: $what has no PICO Platform Service backing. PPS 1.0.x " +
        "publishes no real-time voice artifact."
    )
}
