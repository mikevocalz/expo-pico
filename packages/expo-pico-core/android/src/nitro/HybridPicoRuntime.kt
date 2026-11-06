package com.margelo.nitro.expopico.picocore

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import com.margelo.nitro.core.Callback
import com.margelo.nitro.core.Promise
import expo.modules.pico.BuildConfig
import expo.modules.pico.PicoEskiuBridge

/**
 * `PicoRuntime` — Android sensor data, Eskiu helpers and XR API contracts.
 *
 * SensorManager and PicoEskiuBridge back the implemented methods below.
 * The remaining XR methods do not yet call a headset runtime. An SDK class
 * on the classpath or a BuildConfig declaration cannot implement them, so
 * they reject with NOT_IMPLEMENTED and are not advertised as available.
 */
class HybridPicoRuntime : HybridPicoRuntimeSpec() {

  override val hapticsAvailable: Boolean
    get() = false

  override val passthroughAvailable: Boolean
    get() = false

  /**
   * High-rate motion sensors, read from Android directly.
   *
   * `minDelay` is microseconds between samples, so the maximum rate is its
   * reciprocal. A sensor reporting `minDelay == 0` is on-change rather
   * than continuous and has no meaningful maximum, which is why it is
   * filtered out rather than reported as infinitely fast.
   */
  override fun getHighRateSensors(): Promise<Array<PicoHighRateSensor>> {
    val context = PicoDevice.context() ?: return Promise.resolved(emptyArray())
    return Promise.parallel {
      val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        ?: return@parallel emptyArray()
      SENSOR_TYPES.flatMap { (androidType, picoType) ->
        manager.getSensorList(androidType).mapNotNull { sensor ->
          val minDelay = sensor.minDelay
          if (minDelay <= 0) return@mapNotNull null
          PicoHighRateSensor(
            type = picoType,
            vendor = sensor.vendor,
            name = sensor.name,
            maxHz = 1_000_000.0 / minDelay,
            minDelayMicros = minDelay.toDouble(),
          )
        }
      }.toTypedArray()
    }
  }

  // --- Display -------------------------------------------------------

  override fun getCurrentRefreshRate(): Promise<Double?> = unavailableXrImplementation("getCurrentRefreshRate")

  /**
   * The rates the app declared; this is not a live headset query.
   *
   * These come from the plugin's `refreshRates` option, so they are what
   * the manifest advertises rather than what the headset currently offers.
   * Returning them is more useful than null — an app can still pick from
   * its own declared set — and the distinction is documented on the
   * TypeScript side.
   */
  override fun getSupportedRefreshRates(): Promise<DoubleArray?> {
    val declared = PicoDevice.splitList(BuildConfig.PICO_REFRESH_RATES)
      .mapNotNull { it.toDoubleOrNull() }
    return Promise.resolved(declared.takeIf { it.isNotEmpty() }?.toDoubleArray())
  }

  override fun setRefreshRate(hz: Double): Promise<Boolean> = unavailableXrImplementation("setRefreshRate")

  override fun getFoveationLevel(): Promise<PicoFoveationLevel?> = unavailableXrImplementation("getFoveationLevel")

  override fun setFoveationLevel(level: PicoFoveationLevel): Promise<Boolean> =
    unavailableXrImplementation("setFoveationLevel")

  // --- Passthrough ---------------------------------------------------

  override fun setPassthroughEnabled(enabled: Boolean): Promise<Boolean> =
    needsCapability("setPassthroughEnabled", BuildConfig.PICO_PASSTHROUGH, "passthrough")

  override fun isPassthroughActive(): Promise<Boolean?> =
    needsCapability("isPassthroughActive", BuildConfig.PICO_PASSTHROUGH, "passthrough")

  override fun setPassthroughLevel(enabled: Boolean, level: Double): Promise<Unit> {
    PicoEskiuBridge.normalizePassthroughLevel(level)
    return needsCapability("setPassthroughLevel", BuildConfig.PICO_PASSTHROUGH, "passthrough")
  }

  // --- Tracking ------------------------------------------------------

  override fun enableEyeTracking(): Promise<Boolean> =
    needsCapability("enableEyeTracking", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")

  override fun disableEyeTracking(): Promise<Boolean> =
    needsCapability("disableEyeTracking", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")

  override fun getEyePose(): Promise<PicoEyePose?> =
    needsCapability("getEyePose", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")

  override fun enableFaceTracking(): Promise<Boolean> =
    needsCapability("enableFaceTracking", BuildConfig.PICO_FACE_TRACKING, "faceTracking")

  override fun disableFaceTracking(): Promise<Boolean> =
    needsCapability("disableFaceTracking", BuildConfig.PICO_FACE_TRACKING, "faceTracking")

  override fun getFaceWeights(): Promise<Map<String, Double>?> =
    needsCapability("getFaceWeights", BuildConfig.PICO_FACE_TRACKING, "faceTracking")

  override fun enableBodyTracking(): Promise<Boolean> =
    needsCapability("enableBodyTracking", BuildConfig.PICO_BODY_TRACKING, "bodyTracking")

  override fun disableBodyTracking(): Promise<Boolean> =
    needsCapability("disableBodyTracking", BuildConfig.PICO_BODY_TRACKING, "bodyTracking")

  override fun getBodyJoints(): Promise<Array<PicoBodyJoint>?> =
    needsCapability("getBodyJoints", BuildConfig.PICO_BODY_TRACKING, "bodyTracking")

  override fun enableHandTracking(): Promise<Boolean> =
    needsCapability("enableHandTracking", BuildConfig.PICO_HAND_TRACKING, "handTracking")

  override fun disableHandTracking(): Promise<Boolean> =
    needsCapability("disableHandTracking", BuildConfig.PICO_HAND_TRACKING, "handTracking")

  override fun getHandPose(): Promise<PicoHandPose?> =
    needsCapability("getHandPose", BuildConfig.PICO_HAND_TRACKING, "handTracking")

  // --- Scene / boundary ----------------------------------------------

  override fun isBoundaryVisible(): Promise<Boolean?> =
    needsCapability("isBoundaryVisible", BuildConfig.PICO_BOUNDARY, "boundary")

  override fun setBoundaryVisible(visible: Boolean): Promise<Boolean> =
    needsCapability("setBoundaryVisible", BuildConfig.PICO_BOUNDARY, "boundary")

  override fun getBoundaryGeometry(): Promise<Array<PicoVec3>?> =
    needsCapability("getBoundaryGeometry", BuildConfig.PICO_BOUNDARY, "boundary")

  override fun refreshSceneMesh(): Promise<Boolean> =
    needsCapability("refreshSceneMesh", BuildConfig.PICO_SCENE_MESH, "sceneMesh")

  override fun getSceneMeshTriangleCount(): Promise<Double?> =
    needsCapability("getSceneMeshTriangleCount", BuildConfig.PICO_SCENE_MESH, "sceneMesh")

  override fun getDetectedPlanes(): Promise<Array<PicoDetectedPlane>?> =
    needsCapability(
      "getDetectedPlanes",
      BuildConfig.PICO_SCENE_UNDERSTANDING,
      "sceneUnderstanding",
    )

  override fun refreshScene(): Promise<Boolean> =
    needsCapability("refreshScene", BuildConfig.PICO_SCENE_UNDERSTANDING, "sceneUnderstanding")

  // --- Input ---------------------------------------------------------

  override fun getControllers(): Promise<Array<PicoController>?> = unavailableXrImplementation("getControllers")

  override fun triggerHaptic(
    hand: PicoHand,
    amplitude: Double,
    durationMs: Double,
  ): Promise<Boolean> {
    PicoEskiuBridge.normalizeHapticAmplitude(amplitude)
    return needsCapability("triggerHaptic", BuildConfig.PICO_CONTROLLER_HAPTICS, "controllerHaptics")
  }

  override fun pulseHaptic(
    hand: PicoHapticHand,
    amplitude: Double,
    durationMs: Double,
  ): Promise<Unit> {
    PicoEskiuBridge.normalizeHapticAmplitude(amplitude)
    return needsCapability("pulseHaptic", BuildConfig.PICO_CONTROLLER_HAPTICS, "controllerHaptics")
  }

  override fun getMotionTrackers(): Promise<Array<PicoMotionTracker>?> =
    needsCapability("getMotionTrackers", BuildConfig.PICO_MOTION_TRACKER, "motionTracker")

  // --- Audio ---------------------------------------------------------

  override fun isSpatialAudioEnabled(): Promise<Boolean?> =
    needsCapability("isSpatialAudioEnabled", BuildConfig.PICO_SPATIAL_AUDIO, "spatialAudio")

  override fun setSpatialAudioEnabled(enabled: Boolean): Promise<Boolean> =
    needsCapability("setSpatialAudioEnabled", BuildConfig.PICO_SPATIAL_AUDIO, "spatialAudio")

  override fun getHrtfProfile(): Promise<String?> =
    needsCapability("getHrtfProfile", BuildConfig.PICO_SPATIAL_AUDIO, "spatialAudio")

  /**
   * The passthrough dial is a hardware control on the headset. Its native
   * event delivery is not implemented, including when an SDK is linked.
   * Registration still returns a real id so JS subscribe/unsubscribe code
   * stays uniform; nothing is emitted.
   */
  override fun addPassthroughDialListener(
    listener: Callback<(event: PassthroughLevelEvent) -> Unit>
  ): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  override fun removeListener(id: Double): Unit = Unit

  /**
   * Stroke mesh for SVG element markup, built by the Eskiu runtime. Throws
   * `ESKIU_RUNTIME_UNAVAILABLE` when the library was built without it.
   */
  override fun getIconMesh(
    svgElements: String,
    strokeWidth: Double,
    tolerance: Double,
  ): PicoIconMeshData {
    val mesh = PicoEskiuBridge.iconMesh(svgElements, strokeWidth.toFloat(), tolerance.toFloat())
    return PicoIconMeshData(
      vertices = DoubleArray(mesh.vertices.size) { mesh.vertices[it].toDouble() },
      indices = DoubleArray(mesh.indices.size) { mesh.indices[it].toDouble() },
      vertexCount = mesh.vertexCount.toDouble(),
      indexCount = mesh.indexCount.toDouble(),
    )
  }

  private var listenerCounter: Double = 0.0

  /** Configuration is useful context, but cannot complete native wiring. */
  private fun <T> needsCapability(
    what: String,
    declared: Boolean,
    optionName: String,
  ): Promise<T> {
    val configurationNote = if (declared) "" else
      " This app also does not declare `$optionName: true` in @expo-pico/core plugin options."
    return unavailableXrImplementation(what, configurationNote)
  }

  private fun <T> unavailableXrImplementation(what: String, configurationNote: String = ""): Promise<T> =
    Promise.rejected(
      IllegalStateException(
        "NOT_IMPLEMENTED: @expo-pico/core.$what has no native XR implementation in this release. " +
          "Adding an AAR or enabling plugin flags does not implement this API." + configurationNote
      )
    )

  // Nitro V1: the spec bridge reads this Companion (backs JS `new PicoRuntime()`),
  // so it is no longer private.
  companion object : HybridPicoRuntimeSpec.Companion {
    override fun constructor(): HybridPicoRuntime = HybridPicoRuntime()

    val SENSOR_TYPES = listOf(
      Sensor.TYPE_ACCELEROMETER to PicoSensorType.ACCELEROMETER,
      Sensor.TYPE_GYROSCOPE to PicoSensorType.GYROSCOPE,
      Sensor.TYPE_MAGNETIC_FIELD to PicoSensorType.MAGNETOMETER,
    )
  }
}
