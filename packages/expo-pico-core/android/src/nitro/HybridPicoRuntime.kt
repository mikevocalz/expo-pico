package com.margelo.nitro.expopico.picocore

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import com.margelo.nitro.core.Promise
import expo.modules.pico.BuildConfig

/**
 * `PicoRuntime` — the live XR surface.
 *
 * Where the data comes from, and why it is split:
 *
 * - **Android public APIs** back what they can. High-rate sensors are real
 *   `SensorManager` entries, so `getHighRateSensors()` returns actual
 *   hardware rather than a declaration.
 * - **Everything else needs the PICO XR SDK** — `PXR_Plugin` and friends,
 *   which ship as a vendored AAR under `vendor/pico-sdk/` and are declared
 *   `compileOnly` in `android/build.gradle` so they are never bundled into
 *   the published npm package. That directory is gitignored: the AAR is
 *   under the PICO Developer Agreement and cannot be redistributed.
 *
 * So this class does not reference `PXR_Plugin` types directly. A build
 * with no AAR dropped in has to compile, and a build with one has to work,
 * and a direct import cannot do both. Calls that need the SDK check
 * [xrSdkLinked] and fail with a message naming what is missing.
 *
 * The declared-capability flags below come from `BuildConfig`, which the
 * config plugin fills in at prebuild — they say what the app asked for,
 * which is a different question from whether the SDK is present. Both have
 * to be true for a call to work.
 */
class HybridPicoRuntime : HybridPicoRuntimeSpec() {

  /**
   * Whether the PICO XR SDK is on the runtime classpath.
   *
   * Probed by name rather than imported, for the reason in the class doc.
   */
  private val xrSdkLinked: Boolean
    get() = PicoDevice.classPresent(PXR_PLUGIN_CLASS)

  override val hapticsAvailable: Boolean
    get() = BuildConfig.PICO_CONTROLLER_HAPTICS && xrSdkLinked

  override val passthroughAvailable: Boolean
    get() = BuildConfig.PICO_PASSTHROUGH && xrSdkLinked

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

  override fun getCurrentRefreshRate(): Promise<Double?> = needsXrSdk("getCurrentRefreshRate")

  /**
   * The rates the app declared, when the SDK cannot be asked.
   *
   * These come from the plugin's `refreshRates` option, so they are what
   * the manifest advertises rather than what the headset currently offers.
   * Returning them is more useful than null — an app can still pick from
   * its own declared set — and the distinction is documented on the
   * TypeScript side.
   */
  override fun getSupportedRefreshRates(): Promise<DoubleArray?> {
    if (!xrSdkLinked) {
      val declared = PicoDevice.splitList(BuildConfig.PICO_REFRESH_RATES)
        .mapNotNull { it.toDoubleOrNull() }
      return Promise.resolved(declared.takeIf { it.isNotEmpty() }?.toDoubleArray())
    }
    return needsXrSdk("getSupportedRefreshRates")
  }

  override fun setRefreshRate(hz: Double): Promise<Boolean> = needsXrSdk("setRefreshRate")

  override fun getFoveationLevel(): Promise<PicoFoveationLevel?> = needsXrSdk("getFoveationLevel")

  override fun setFoveationLevel(level: PicoFoveationLevel): Promise<Boolean> =
    needsXrSdk("setFoveationLevel")

  // --- Passthrough ---------------------------------------------------

  override fun setPassthroughEnabled(enabled: Boolean): Promise<Boolean> =
    needsCapability("setPassthroughEnabled", BuildConfig.PICO_PASSTHROUGH, "passthrough")

  override fun isPassthroughActive(): Promise<Boolean?> =
    needsCapability("isPassthroughActive", BuildConfig.PICO_PASSTHROUGH, "passthrough")

  override fun setPassthroughLevel(enabled: Boolean, level: Double): Promise<Unit> =
    needsCapability("setPassthroughLevel", BuildConfig.PICO_PASSTHROUGH, "passthrough")

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

  override fun getControllers(): Promise<Array<PicoController>?> = needsXrSdk("getControllers")

  override fun triggerHaptic(
    hand: PicoHand,
    amplitude: Double,
    durationMs: Double,
  ): Promise<Boolean> =
    needsCapability("triggerHaptic", BuildConfig.PICO_CONTROLLER_HAPTICS, "controllerHaptics")

  override fun pulseHaptic(
    hand: PicoHapticHand,
    amplitude: Double,
    durationMs: Double,
  ): Promise<Unit> =
    needsCapability("pulseHaptic", BuildConfig.PICO_CONTROLLER_HAPTICS, "controllerHaptics")

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
   * The passthrough dial is a hardware control on the headset. Reading it
   * needs the XR SDK, so with no SDK linked there is nothing to listen to.
   * Registration still returns a real id so JS subscribe/unsubscribe code
   * stays uniform; nothing is emitted.
   */
  override fun addPassthroughDialListener(
    listener: (event: PassthroughLevelEvent) -> Unit
  ): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  override fun removeListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  /**
   * Rejects with which of the two preconditions failed.
   *
   * Separating them matters for debugging: "you did not declare this
   * capability" is fixed in `app.config.ts`, while "the SDK is not linked"
   * is fixed by dropping the AAR into `vendor/pico-sdk/`. A single generic
   * error would send the developer to the wrong place.
   */
  private fun <T> needsCapability(
    what: String,
    declared: Boolean,
    optionName: String,
  ): Promise<T> {
    if (!declared) {
      return Promise.rejected(
        IllegalStateException(
          "CAPABILITY_NOT_DECLARED: $what requires `$optionName: true` in the " +
            "@expo-pico/core plugin options. Add it and re-run prebuild."
        )
      )
    }
    return needsXrSdk(what)
  }

  private fun <T> needsXrSdk(what: String): Promise<T> =
    Promise.rejected(
      IllegalStateException(
        "XR_SDK_NOT_LINKED: $what requires the PICO XR SDK ($PXR_PLUGIN_CLASS), which " +
          "is not on the classpath. The AAR is licensed under the PICO Developer " +
          "Agreement and cannot be redistributed, so it is not vendored in this " +
          "package — see vendor/pico-sdk/README.md for how to obtain and place it."
      )
    )

  private companion object {
    const val PXR_PLUGIN_CLASS = "com.picovr.picovrlib.PXR_Plugin"

    val SENSOR_TYPES = listOf(
      Sensor.TYPE_ACCELEROMETER to PicoSensorType.ACCELEROMETER,
      Sensor.TYPE_GYROSCOPE to PicoSensorType.GYROSCOPE,
      Sensor.TYPE_MAGNETIC_FIELD to PicoSensorType.MAGNETOMETER,
    )
  }
}
