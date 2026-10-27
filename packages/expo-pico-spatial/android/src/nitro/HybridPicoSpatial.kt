package com.margelo.nitro.expopico.spatial

import android.util.Log
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Callback
import com.margelo.nitro.core.Promise
import expo.modules.pico.spatial.BuildConfig
import expo.modules.pico.spatial.SpatialContainerBridge

/**
 * `PicoSpatial` — spatial anchors, space transitions and scene data.
 *
 * All of this rides on the PICO Spatial Tools SDK and the PICO XR SDK,
 * both of which ship as vendored AARs under `vendor/pico-sdk/` and are
 * declared `compileOnly` so they are never bundled into the published npm
 * package. That directory is gitignored: the AARs are covered by the PICO
 * Developer Agreement and may not be redistributed.
 *
 * As in `@expo-pico/core`, the SDK is therefore reached by name rather
 * than imported — a build with no AAR present has to compile, and a build
 * with one has to work. What this class can answer without the SDK is the
 * declared configuration: `spaceState` and `containerType` come from
 * `BuildConfig`, which the config plugin writes at prebuild, and
 * `capabilities` reports what was declared joined with whether the SDK is
 * actually linked.
 */
class HybridPicoSpatial : HybridPicoSpatialSpec() {

  private val spatialSdkLinked: Boolean
    get() = classPresent(SPATIAL_SDK_CLASS)

  private val xrSdkLinked: Boolean
    get() = classPresent(PXR_PLUGIN_CLASS)

  /**
   * The space the app declared it starts in.
   *
   * `spatialMode` is the plugin option: `2d` runs in the shared home
   * space, immersive modes take the full space. Live transitions need the
   * SDK, so with none linked this is the configured value rather than an
   * observed one.
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

  /** No version string is exposed on the AAR, so presence is the answer. */
  override val spatialSdkVersion: String?
    get() = if (spatialSdkLinked) "present" else null

  /**
   * Declared capability AND linked SDK — both, because either alone
   * misleads. An app that declared `passthrough` but shipped without the
   * AAR would otherwise be told passthrough is available right up until
   * the first call fails.
   */
  override val capabilities: SpatialCapabilities
    get() = SpatialCapabilities(
      spaceStates = spatialSdkLinked,
      spatialAnchors = spatialSdkLinked,
      sceneUnderstanding = BuildConfig.PICO_SCENE_UNDERSTANDING && xrSdkLinked,
      passthrough = BuildConfig.PICO_PASSTHROUGH && xrSdkLinked,
      handTracking = BuildConfig.PICO_HAND_TRACKING && xrSdkLinked,
      spatialSdkAvailable = spatialSdkLinked,
    )

  override val eyeGazeAvailable: Boolean
    get() = BuildConfig.PICO_EYE_TRACKING && xrSdkLinked

  override val sceneMeshAvailable: Boolean
    get() = BuildConfig.PICO_SCENE_MESH && xrSdkLinked

  override val faceTrackingAvailable: Boolean
    get() = BuildConfig.PICO_FACE_TRACKING && xrSdkLinked

  override val bodyTrackingAvailable: Boolean
    get() = BuildConfig.PICO_BODY_TRACKING && xrSdkLinked

  /**
   * Which SDK classes are linked, keyed by a stable name.
   *
   * This is the diagnostic an app calls when something reports
   * unavailable: it says which AAR is missing, rather than only that
   * something is.
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
    needsSpatialSdk("createSpatialAnchor")

  override fun setWindowContainerProperties(
    props: WindowContainerProperties
  ): Promise<Unit> = needsSpatialSdk("setWindowContainerProperties")

  override fun requestFullSpace(): Promise<Unit> = needsSpatialSdk("requestFullSpace")

  override fun getGazeSnapshot(): Promise<GazePose?> =
    needsCapability("getGazeSnapshot", BuildConfig.PICO_EYE_TRACKING, "eyeTracking")

  override fun getSceneMesh(): Promise<SceneMeshRaw> =
    needsCapability("getSceneMesh", BuildConfig.PICO_SCENE_MESH, "sceneMesh")

  // Streaming surfaces. Registration returns a real id so JS
  // subscribe/unsubscribe code stays uniform across packages; with no SDK
  // linked there is nothing producing frames, so nothing is emitted.
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

  /**
   * Distinguishes "not declared" from "SDK missing" for the same reason
   * `@expo-pico/core` does: the first is fixed in `app.config.ts`, the
   * second by placing the AAR. One generic error sends the developer to
   * the wrong file.
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
    return needsSpatialSdk(what)
  }

  private fun <T> needsSpatialSdk(what: String): Promise<T> =
    Promise.rejected(
      IllegalStateException(
        "SPATIAL_SDK_NOT_LINKED: $what requires the PICO Spatial Tools SDK, which is " +
          "not on the classpath. The AARs are licensed under the PICO Developer " +
          "Agreement and cannot be redistributed, so they are not vendored in this " +
          "package — see vendor/pico-sdk/README.md for how to obtain and place them. " +
          "Call getSpatialSdkProbe() to see exactly which classes are missing."
      )
    )

  // Nitro V1: the spec bridge reads this Companion (backs JS `new PicoSpatial()`).
  companion object : HybridPicoSpatialSpec.Companion {
    override fun constructor(): HybridPicoSpatial = HybridPicoSpatial()

    private const val TAG = "ExpoPicoSpatial"
    const val SPATIAL_SDK_CLASS = "com.picovr.spatial.SpatialAnchorManager"
    const val PXR_PLUGIN_CLASS = "com.picovr.picovrlib.PXR_Plugin"

    val SDK_PROBES = mapOf(
      // Legacy/private PVR-era Spatial SDK seam still used by the anchor path.
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
