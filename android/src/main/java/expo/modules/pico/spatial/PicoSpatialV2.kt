package expo.modules.pico.spatial

import android.util.Log
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.react.currentActivity
import io.github.expo.modules.v2.react.reactContextOrNull

@ExpoModule
object PicoSpatialV2 : Module() {
  private const val TAG = "ExpoPicoSpatial"

  // initialize = false: this answers "is the class in the APK", and running a
  // Spatial SDK static initializer on PICO OS 5 can itself throw.
  private fun classPresent(name: String): Boolean =
    runCatching { Class.forName(name, false, PicoSpatialV2::class.java.classLoader) }.isSuccess

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

  /**
   * Whether the WindowContainer bridge can run here. `sdkLinked` is classpath
   * presence; `spatialPlatform` is SpatialBuild.isSpatialPlatform() at
   * runtime. Both must be true before open/closeWindowContainer do anything.
   */
  @JS
  fun getLayoutBridgeStatus(): Map<String, Any?> {
    val status = bridgeStatus()
    return mapOf(
      "sdkLinked" to status.sdkLinked,
      "spatialPlatform" to status.spatialPlatform,
      "reason" to status.reason,
      "lastError" to SpatialContainerBridge.lastError,
    )
  }

  /**
   * Opens a PICO OS 6 WindowContainer hosting the current activity's class.
   * Returns false, never throws, when the SDK isn't linked, the device isn't
   * a spatial platform, there is no activity, or the SDK call throws.
   */
  @JS
  fun openWindowContainer(id: String, tag: String?): Boolean {
    val activity = reactContextOrNull?.currentActivity
    if (activity == null) {
      Log.w(TAG, "openWindowContainer('$id') rejected: no current activity")
      return false
    }
    return guardBridge("openWindowContainer") {
      SpatialContainerBridge.openWindowContainer(activity, id, activity.javaClass, tag)
    }
  }

  @JS
  fun closeWindowContainer(id: String, tag: String?): Boolean =
    guardBridge("closeWindowContainer") { SpatialContainerBridge.closeWindowContainer(id, tag) }

  // SpatialContainerBridge links against SDK classes. Loading it on a build
  // without them should only fail inside its own methods, but this keeps a
  // verifier or linkage surprise from ever reaching JS as a crash.
  private fun bridgeStatus(): SpatialContainerBridge.Status =
    runCatching { SpatialContainerBridge.status }.getOrElse {
      SpatialContainerBridge.Status(
        sdkLinked = false,
        spatialPlatform = false,
        reason = "SPATIAL_BRIDGE_UNAVAILABLE: ${it.javaClass.name}: ${it.message}",
      )
    }

  private inline fun guardBridge(what: String, call: () -> Boolean): Boolean =
    runCatching(call).getOrElse {
      Log.w(TAG, "$what failed: ${it.javaClass.name}: ${it.message}", it)
      false
    }

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
    // Legacy/private PVR-era Spatial SDK seam still used by the existing bridge.
    "legacySpatialAnchors" to SPATIAL_SDK_CLASS,

    // Public PICO Spatial SDK 6.x runtime probes. These do not imply that the
    // Expo bridge is bound yet; JavaScript exposes nativeLayoutBridgeBound
    // separately so apps never confuse classpath presence with usable APIs.
    "spatialUiScope" to "com.pico.spatial.ui.foundation.dsl.SpatialAppScope",
    "attachmentPanel" to "com.pico.spatial.core.ecs.AttachmentPanelComponent",
    "spatialNavigator" to "com.pico.spatial.ui.platform.containers.SpatialNavigator",

    "pxrPlugin" to PXR_PLUGIN_CLASS,
    "sceneUnderstanding" to "com.picovr.picovrlib.PXR_MixedReality",
    "eyeTracking" to "com.picovr.picovrlib.PXR_EyeTracking",
  )
}
