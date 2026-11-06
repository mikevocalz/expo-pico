package com.margelo.nitro.expopico.spatial

import android.util.Log
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Callback
import com.margelo.nitro.core.Promise
import expo.modules.pico.spatial.BuildConfig
import expo.modules.pico.spatial.SpatialContainerBridge

/**
 * `PicoSpatial` — SDK 6 WindowContainer bridge and spatial API contracts.
 *
 * WindowContainer open/close use SpatialContainerBridge when the public
 * Maven SDK is linked and the device supports it. Anchors, live space
 * transitions and tracking/scene data still need native implementations.
 * Class presence and app declarations do not make those APIs available.
 * `spaceState` and `containerType` describe configured starting values.
 */
class HybridPicoSpatial : HybridPicoSpatialSpec() {

  private val spatialSdkLinked: Boolean
    get() = bridgeStatus().sdkLinked

  /**
   * The space the app declared it starts in.
   *
   * `spatialMode` is the plugin option: `2d` runs in the shared home
   * space, immersive modes take the full space. Live transitions are not
   * implemented, so this is a configured value rather than an observed one.
   */
  override val spaceState: PicoSpaceState
    get() = when (BuildConfig.PICO_SPATIAL_MODE) {
      "2d" -> PicoSpaceState.SHARED_SPACE
      "immersive", "full" -> PicoSpaceState.FULL_SPACE
      else -> PicoSpaceState.UNKNOWN
    }

  override val containerType: PicoContainerType
    get() = when (BuildConfig.PICO_CONTAINER_MODE) {
      "window" -> PicoContainerType.WINDOW_CONTAINER
      "stage" -> PicoContainerType.STAGE
      else -> PicoContainerType.NONE
    }

  /** Compatibility presence marker for the SDK 6 bridge, not a version number. */
  override val spatialSdkVersion: String?
    get() = if (spatialSdkLinked) "present" else null

  /**
   * Only implemented methods can advertise availability. SDK presence is
   * reported separately and does not imply anchors or tracking work.
   */
  override val capabilities: SpatialCapabilities
    get() = SpatialCapabilities(
      spaceStates = false,
      spatialAnchors = false,
      sceneUnderstanding = false,
      passthrough = false,
      handTracking = false,
      spatialSdkAvailable = spatialSdkLinked,
    )

  override val eyeGazeAvailable: Boolean
    get() = false

  override val sceneMeshAvailable: Boolean
    get() = false

  override val faceTrackingAvailable: Boolean
    get() = false

  override val bodyTrackingAvailable: Boolean
    get() = false

  /**
   * Which SDK classes are linked, keyed by a stable name.
   *
   * Diagnostic classpath information only. A present class does not mean
   * expo-pico has implemented the corresponding native API.
   */
  override fun getSpatialSdkProbe(): Map<String, Boolean> =
    SDK_PROBES.mapValues { (_, className) -> classPresent(className) }

  /**
   * Whether the WindowContainer bridge can run here. `sdkLinked` is classpath
   * presence; `spatialPlatform` is SpatialBuild.isSpatialPlatform() at
   * runtime. Both must be true before open/closeWindowContainer do anything.
   */
  override fun getLayoutBridgeStatus(): SpatialLayoutBridgeStatus {
    val status = bridgeStatus()
    return SpatialLayoutBridgeStatus(
      sdkLinked = status.sdkLinked,
      spatialPlatform = status.spatialPlatform,
      reason = status.reason,
      lastError = SpatialContainerBridge.lastError,
    )
  }

  /**
   * Opens a PICO OS 6 WindowContainer hosting the current activity's class.
   * Returns false, never throws, when the SDK isn't linked, the device isn't
   * a spatial platform, there is no activity, or the SDK call throws.
   */
  override fun openWindowContainer(id: String, tag: String?): Boolean {
    val activity = NitroModules.applicationContext?.currentActivity
    if (activity == null) {
      Log.w(TAG, "openWindowContainer('$id') rejected: no current activity")
      return false
    }
    return guardBridge("openWindowContainer") {
      SpatialContainerBridge.openWindowContainer(activity, id, activity.javaClass, tag)
    }
  }

  override fun closeWindowContainer(id: String, tag: String?): Boolean =
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

  override fun createSpatialAnchor(pose: SpatialPose): Promise<SpatialAnchorResult> =
    unavailableSpatialImplementation("createSpatialAnchor")

  override fun setWindowContainerProperties(
    props: WindowContainerProperties
  ): Promise<Unit> = unavailableSpatialImplementation("setWindowContainerProperties")

  override fun requestFullSpace(): Promise<Unit> = unavailableSpatialImplementation("requestFullSpace")

  override fun getGazeSnapshot(): Promise<GazePose?> =
    needsCapability("getGazeSnapshot", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")

  override fun getSceneMesh(): Promise<SceneMeshRaw> =
    needsCapability("getSceneMesh", BuildConfig.PICO_SCENE_MESH, "sceneMesh")

  // Streaming surfaces. Registration returns a real id so JS
  // subscribe/unsubscribe code stays uniform across packages. Native event
  // delivery is not implemented, so no frames are emitted even with an SDK.
  override fun addGazeListener(listener: Callback<(gaze: GazePose) -> Unit>): Double = nextListenerId()

  override fun addSceneMeshUpdateListener(listener: Callback<(mesh: SceneMeshRaw) -> Unit>): Double =
    nextListenerId()

  override fun addFaceListener(listener: Callback<(blendShapes: Map<String, Double>) -> Unit>): Double =
    nextListenerId()

  override fun addBodyListener(listener: Callback<(joints: Array<SpatialBodyJoint>) -> Unit>): Double =
    nextListenerId()

  override fun removeListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  private fun nextListenerId(): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  // initialize = false: this answers "is the class in the APK", and running a
  // Spatial SDK static initializer on PICO OS 5 can itself throw.
  private fun classPresent(className: String): Boolean =
    runCatching { Class.forName(className, false, HybridPicoSpatial::class.java.classLoader) }
      .isSuccess

  /** Configuration is useful context, but cannot complete native wiring. */
  private fun <T> needsCapability(
    what: String,
    declared: Boolean,
    optionName: String,
  ): Promise<T> {
    val configurationNote = if (declared) "" else
      " This app also does not declare `$optionName: true` in @expo-pico/core plugin options."
    return unavailableSpatialImplementation(what, configurationNote)
  }

  private fun <T> unavailableSpatialImplementation(what: String, configurationNote: String = ""): Promise<T> =
    Promise.rejected(
      IllegalStateException(
        "NOT_IMPLEMENTED: @expo-pico/spatial.$what has no native implementation in this release. " +
          "Adding an AAR or enabling plugin flags does not implement this API." + configurationNote
      )
    )

  // Nitro V1: the spec bridge reads this Companion (backs JS `new PicoSpatial()`).
  companion object : HybridPicoSpatialSpec.Companion {
    override fun constructor(): HybridPicoSpatial = HybridPicoSpatial()

    private const val TAG = "ExpoPicoSpatial"
    const val SPATIAL_SDK_CLASS = "com.picovr.spatial.SpatialAnchorManager"
    const val PXR_PLUGIN_CLASS = "com.picovr.picovrlib.PXR_Plugin"

    val SDK_PROBES = mapOf(
      // Legacy classpath probe; the anchor API has no native implementation.
      "legacySpatialAnchors" to SPATIAL_SDK_CLASS,

      // Public PICO Spatial SDK 6.x runtime probes. Class presence does not
      // mean the layout bridge is usable; JS reads getLayoutBridgeStatus()
      // for that, so apps never confuse the two.
      "spatialUiScope" to "com.pico.spatial.ui.foundation.dsl.SpatialAppScope",
      "attachmentPanel" to "com.pico.spatial.core.ecs.AttachmentPanelComponent",
      "spatialNavigator" to "com.pico.spatial.ui.platform.containers.SpatialNavigator",

      "pxrPlugin" to PXR_PLUGIN_CLASS,
      "sceneUnderstanding" to "com.picovr.picovrlib.PXR_MixedReality",
      "eyeTracking" to "com.picovr.picovrlib.PXR_EyeTracking",
    )
  }
}
