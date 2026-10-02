package expo.modules.pico.spatial

import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module

@ExpoModule
object PicoSpatialV2 : Module() {
  private fun classPresent(name: String): Boolean =
    runCatching { Class.forName(name); true }.getOrDefault(false)

  private val spatialSdkLinked: Boolean
    get() = classPresent(SPATIAL_SDK_CLASS)

  private val xrSdkLinked: Boolean
    get() = classPresent(PXR_PLUGIN_CLASS)

  @JS
  fun getInfo(): Map<String, Any?> = mapOf(
    "apiVersion" to 2,
    "spaceState" to when (BuildConfig.PICO_SPATIAL_MODE) {
      "2d" -> "shared-space"
      "immersive", "full" -> "full-space"
      else -> "unknown"
    },
    "containerType" to when (BuildConfig.PICO_CONTAINER_MODE) {
      "window" -> "window-container"
      "stage" -> "stage"
      else -> "none"
    },
    "spatialSdkVersion" to if (spatialSdkLinked) "present" else null,
    "capabilities" to mapOf(
      "spaceStates" to spatialSdkLinked,
      "spatialAnchors" to spatialSdkLinked,
      "sceneUnderstanding" to (BuildConfig.PICO_SCENE_UNDERSTANDING && xrSdkLinked),
      "passthrough" to (BuildConfig.PICO_PASSTHROUGH && xrSdkLinked),
      "handTracking" to (BuildConfig.PICO_HAND_TRACKING && xrSdkLinked),
      "spatialSdkAvailable" to spatialSdkLinked,
    ),
    "eyeGazeAvailable" to (BuildConfig.PICO_EYE_TRACKING && xrSdkLinked),
    "sceneMeshAvailable" to (BuildConfig.PICO_SCENE_MESH && xrSdkLinked),
    "faceTrackingAvailable" to (BuildConfig.PICO_FACE_TRACKING && xrSdkLinked),
    "bodyTrackingAvailable" to (BuildConfig.PICO_BODY_TRACKING && xrSdkLinked),
  )

  @JS
  fun getSpatialSdkProbe(): Map<String, Boolean> =
    SDK_PROBES.mapValues { (_, className) -> classPresent(className) }

  private fun requireSpatial(what: String): Nothing =
    throw IllegalStateException(
      "SPATIAL_SDK_NOT_LINKED: $what requires the PICO Spatial Tools SDK, " +
        "which expo-pico does not redistribute."
    )

  private fun requireCapability(what: String, declared: Boolean, option: String): Nothing {
    if (!declared) {
      throw IllegalStateException(
        "CAPABILITY_NOT_DECLARED: $what requires `$option: true` in @expo-pico/core."
      )
    }
    requireSpatial(what)
  }

  @JS
  fun createSpatialAnchor(pose: Map<String, Any?>): Map<String, Any?> = requireSpatial("createSpatialAnchor")

  @JS
  fun setWindowContainerProperties(props: Map<String, Any?>) {
    requireSpatial("setWindowContainerProperties")
  }

  @JS
  fun requestFullSpace() {
    requireSpatial("requestFullSpace")
  }

  @JS
  fun getGazeSnapshot(): Map<String, Any?>? =
    requireCapability("getGazeSnapshot", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")

  @JS
  fun getSceneMesh(): Map<String, Any?> =
    requireCapability("getSceneMesh", BuildConfig.PICO_SCENE_MESH, "sceneMesh")

  private const val SPATIAL_SDK_CLASS = "com.picovr.spatial.SpatialAnchorManager"
  private const val PXR_PLUGIN_CLASS = "com.picovr.picovrlib.PXR_Plugin"

  private val SDK_PROBES = mapOf(
    "spatialAnchors" to SPATIAL_SDK_CLASS,
    "pxrPlugin" to PXR_PLUGIN_CLASS,
    "sceneUnderstanding" to "com.picovr.picovrlib.PXR_MixedReality",
    "eyeTracking" to "com.picovr.picovrlib.PXR_EyeTracking",
  )
}
