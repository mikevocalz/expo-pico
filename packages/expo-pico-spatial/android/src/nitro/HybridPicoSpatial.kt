package com.margelo.nitro.expopico.spatial

import com.margelo.nitro.core.Promise
import expo.modules.pico.spatial.BuildConfig

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
  override fun getSpatialSdkProbe(): Promise<Map<String, Boolean>> =
    Promise.resolved(SDK_PROBES.mapValues { (_, className) -> classPresent(className) })

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
  override fun addGazeListener(listener: (gaze: GazePose) -> Unit): Double = nextListenerId()

  override fun addSceneMeshUpdateListener(listener: (mesh: SceneMeshRaw) -> Unit): Double =
    nextListenerId()

  override fun addFaceListener(listener: (blendShapes: Map<String, Double>) -> Unit): Double =
    nextListenerId()

  override fun addBodyListener(listener: (joints: Array<SpatialBodyJoint>) -> Unit): Double =
    nextListenerId()

  override fun removeListener(id: Double): Unit = Unit

  private var listenerCounter: Double = 0.0

  private fun nextListenerId(): Double {
    listenerCounter += 1.0
    return listenerCounter
  }

  private fun classPresent(className: String): Boolean =
    runCatching { Class.forName(className); true }.getOrDefault(false)

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

  private companion object {
    const val SPATIAL_SDK_CLASS = "com.picovr.spatial.SpatialAnchorManager"
    const val PXR_PLUGIN_CLASS = "com.picovr.picovrlib.PXR_Plugin"

    val SDK_PROBES = mapOf(
      "spatialAnchors" to SPATIAL_SDK_CLASS,
      "pxrPlugin" to PXR_PLUGIN_CLASS,
      "sceneUnderstanding" to "com.picovr.picovrlib.PXR_MixedReality",
      "eyeTracking" to "com.picovr.picovrlib.PXR_EyeTracking",
    )
  }
}
