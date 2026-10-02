package expo.modules.pico

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorManager
import com.facebook.react.bridge.ReactApplicationContext
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module

@ExpoModule
object PicoRuntimeV2 : Module() {
  private val reactContext: ReactApplicationContext?
    get() = appContext.reactContext as? ReactApplicationContext

  private fun classPresent(name: String): Boolean =
    runCatching { Class.forName(name); true }.getOrDefault(false)

  private val xrSdkLinked: Boolean
    get() = classPresent(PXR_PLUGIN_CLASS)

  private fun requireCapability(what: String, declared: Boolean, optionName: String): Nothing {
    if (!declared) {
      throw IllegalStateException(
        "CAPABILITY_NOT_DECLARED: $what requires `$optionName: true` in @expo-pico/core plugin options."
      )
    }
    throw IllegalStateException(
      "XR_SDK_NOT_LINKED: $what requires the PICO XR SDK ($PXR_PLUGIN_CLASS). " +
        "The AAR is not redistributed by expo-pico."
    )
  }

  private fun requireXr(what: String): Nothing =
    throw IllegalStateException(
      "XR_SDK_NOT_LINKED: $what requires the PICO XR SDK ($PXR_PLUGIN_CLASS). " +
        "The AAR is not redistributed by expo-pico."
    )

  @JS
  fun getAvailability(): Map<String, Boolean> = mapOf(
    "hapticsAvailable" to (BuildConfig.PICO_CONTROLLER_HAPTICS && xrSdkLinked),
    "passthroughAvailable" to (BuildConfig.PICO_PASSTHROUGH && xrSdkLinked),
  )

  @JS
  fun getSupportedRefreshRates(): List<Double>? {
    if (xrSdkLinked) requireXr("getSupportedRefreshRates")
    return BuildConfig.PICO_REFRESH_RATES
      .split(',')
      .map(String::trim)
      .filter(String::isNotEmpty)
      .mapNotNull(String::toDoubleOrNull)
      .takeIf(List<Double>::isNotEmpty)
  }

  @JS
  fun getHighRateSensors(): List<Map<String, Any>> {
    val context = reactContext ?: return emptyList()
    val manager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return emptyList()
    return SENSOR_TYPES.flatMap { (androidType, picoType) ->
      manager.getSensorList(androidType).mapNotNull { sensor ->
        if (sensor.minDelay <= 0) return@mapNotNull null
        mapOf(
          "type" to picoType,
          "vendor" to sensor.vendor,
          "name" to sensor.name,
          "maxHz" to (1_000_000.0 / sensor.minDelay),
          "minDelayMicros" to sensor.minDelay.toDouble(),
        )
      }
    }
  }

  @JS fun getCurrentRefreshRate(): Double? = requireXr("getCurrentRefreshRate")
  @JS fun setRefreshRate(hz: Double): Boolean = requireXr("setRefreshRate")
  @JS fun getFoveationLevel(): String? = requireXr("getFoveationLevel")
  @JS fun setFoveationLevel(level: String): Boolean = requireXr("setFoveationLevel")

  @JS fun setPassthroughEnabled(enabled: Boolean): Boolean =
    requireCapability("setPassthroughEnabled", BuildConfig.PICO_PASSTHROUGH, "passthrough")
  @JS fun isPassthroughActive(): Boolean? =
    requireCapability("isPassthroughActive", BuildConfig.PICO_PASSTHROUGH, "passthrough")
  @JS fun setPassthroughLevel(enabled: Boolean, level: Double) =
    requireCapability("setPassthroughLevel", BuildConfig.PICO_PASSTHROUGH, "passthrough")

  @JS fun enableEyeTracking(): Boolean = requireCapability("enableEyeTracking", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")
  @JS fun disableEyeTracking(): Boolean = requireCapability("disableEyeTracking", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")
  @JS fun getEyePose(): Map<String, Any?>? = requireCapability("getEyePose", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")
  @JS fun enableFaceTracking(): Boolean = requireCapability("enableFaceTracking", BuildConfig.PICO_FACE_TRACKING, "faceTracking")
  @JS fun disableFaceTracking(): Boolean = requireCapability("disableFaceTracking", BuildConfig.PICO_FACE_TRACKING, "faceTracking")
  @JS fun getFaceWeights(): Map<String, Double>? = requireCapability("getFaceWeights", BuildConfig.PICO_FACE_TRACKING, "faceTracking")
  @JS fun enableBodyTracking(): Boolean = requireCapability("enableBodyTracking", BuildConfig.PICO_BODY_TRACKING, "bodyTracking")
  @JS fun disableBodyTracking(): Boolean = requireCapability("disableBodyTracking", BuildConfig.PICO_BODY_TRACKING, "bodyTracking")
  @JS fun getBodyJoints(): List<Map<String, Any>>? = requireCapability("getBodyJoints", BuildConfig.PICO_BODY_TRACKING, "bodyTracking")
  @JS fun enableHandTracking(): Boolean = requireCapability("enableHandTracking", BuildConfig.PICO_HAND_TRACKING, "handTracking")
  @JS fun disableHandTracking(): Boolean = requireCapability("disableHandTracking", BuildConfig.PICO_HAND_TRACKING, "handTracking")
  @JS fun getHandPose(): Map<String, Any?>? = requireCapability("getHandPose", BuildConfig.PICO_HAND_TRACKING, "handTracking")
  @JS fun isBoundaryVisible(): Boolean? = requireCapability("isBoundaryVisible", BuildConfig.PICO_BOUNDARY, "boundary")
  @JS fun setBoundaryVisible(visible: Boolean): Boolean = requireCapability("setBoundaryVisible", BuildConfig.PICO_BOUNDARY, "boundary")
  @JS fun getBoundaryGeometry(): List<Map<String, Double>>? = requireCapability("getBoundaryGeometry", BuildConfig.PICO_BOUNDARY, "boundary")
  @JS fun refreshSceneMesh(): Boolean = requireCapability("refreshSceneMesh", BuildConfig.PICO_SCENE_MESH, "sceneMesh")
  @JS fun getSceneMeshTriangleCount(): Double? = requireCapability("getSceneMeshTriangleCount", BuildConfig.PICO_SCENE_MESH, "sceneMesh")
  @JS fun getDetectedPlanes(): List<Map<String, Any>>? = requireCapability("getDetectedPlanes", BuildConfig.PICO_SCENE_UNDERSTANDING, "sceneUnderstanding")
  @JS fun refreshScene(): Boolean = requireCapability("refreshScene", BuildConfig.PICO_SCENE_UNDERSTANDING, "sceneUnderstanding")
  @JS fun getControllers(): List<Map<String, Any>>? = requireXr("getControllers")
  @JS fun triggerHaptic(hand: String, amplitude: Double, durationMs: Double): Boolean =
    requireCapability("triggerHaptic", BuildConfig.PICO_CONTROLLER_HAPTICS, "controllerHaptics")
  @JS fun pulseHaptic(hand: String, amplitude: Double, durationMs: Double) =
    requireCapability("pulseHaptic", BuildConfig.PICO_CONTROLLER_HAPTICS, "controllerHaptics")
  @JS fun getMotionTrackers(): List<Map<String, Any>>? =
    requireCapability("getMotionTrackers", BuildConfig.PICO_MOTION_TRACKER, "motionTracker")
  @JS fun isSpatialAudioEnabled(): Boolean? =
    requireCapability("isSpatialAudioEnabled", BuildConfig.PICO_SPATIAL_AUDIO, "spatialAudio")
  @JS fun setSpatialAudioEnabled(enabled: Boolean): Boolean =
    requireCapability("setSpatialAudioEnabled", BuildConfig.PICO_SPATIAL_AUDIO, "spatialAudio")
  @JS fun getHrtfProfile(): String? =
    requireCapability("getHrtfProfile", BuildConfig.PICO_SPATIAL_AUDIO, "spatialAudio")

  private const val PXR_PLUGIN_CLASS = "com.picovr.picovrlib.PXR_Plugin"
  private val SENSOR_TYPES = listOf(
    Sensor.TYPE_ACCELEROMETER to "accelerometer",
    Sensor.TYPE_GYROSCOPE to "gyroscope",
    Sensor.TYPE_MAGNETIC_FIELD to "magnetometer",
  )
}
