package com.margelo.nitro.expopico.picocore

import android.content.Intent
import android.content.pm.FeatureInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import com.margelo.nitro.core.Promise
import expo.modules.pico.BuildConfig
import expo.modules.pico.PicoActivityHolder

/**
 * `PicoCore` — what this build declared, and what the device actually has.
 *
 * Every property here is synchronous and cheap because it reads
 * `BuildConfig`, which the `withPicoGradle` config plugin fills in at
 * prebuild time. The methods are promises because they go to
 * `PackageManager`.
 *
 * Nothing in this class talks to the PICO Platform Service. Core is the
 * package that answers "what kind of build is this and what is it running
 * on" — the services live in the sibling packages.
 */
class HybridPicoCore : HybridPicoCoreSpec() {

  override val isPicoBuild: Boolean
    get() = PicoDevice.isPicoBuild

  override val isPicoDevice: Boolean
    get() = PicoDevice.isPicoDevice

  override val spatialMode: String
    get() = BuildConfig.PICO_SPATIAL_MODE

  override val containerMode: String
    get() = BuildConfig.PICO_CONTAINER_MODE

  override val targetProfile: PicoTargetProfile
    get() = when (BuildConfig.PICO_TARGET_PROFILE) {
      "legacy" -> PicoTargetProfile.LEGACY
      "pico4" -> PicoTargetProfile.PICO4
      "pico4ultra" -> PicoTargetProfile.PICO4ULTRA
      "swan" -> PicoTargetProfile.SWAN
      else -> PicoTargetProfile.UNKNOWN
    }

  override val xrMode: PicoXRMode
    get() = when (BuildConfig.PICO_XR_MODE) {
      "pico-os5" -> PicoXRMode.PICO_OS5
      "pico-swan" -> PicoXRMode.PICO_SWAN
      else -> PicoXRMode.MOBILE
    }

  override val appType: PicoAppType
    get() = when (BuildConfig.PICO_APP_TYPE) {
      "vr" -> PicoAppType.VR
      "mr" -> PicoAppType.MR
      else -> PicoAppType._2D
    }

  // Empty means the developer did not configure identity, which is a
  // different state from "configured as empty string" — hence null.
  override val picoAppId: String?
    get() = BuildConfig.PICO_APP_ID.takeIf { it.isNotEmpty() }

  override val picoAppKey: String?
    get() = BuildConfig.PICO_APP_KEY.takeIf { it.isNotEmpty() }

  override val hasPlatformIdentity: Boolean
    get() = BuildConfig.PICO_HAS_PLATFORM_IDENTITY

  override val hasIapIdentity: Boolean
    get() = BuildConfig.PICO_HAS_IAP_IDENTITY

  /**
   * PICO OS version.
   *
   * PICO OS does not expose its own version through a public API; the
   * Android release it is built on is the closest reliable answer, and
   * only meaningful on real hardware.
   */
  override val picoOsVersion: String?
    get() = if (PicoDevice.isPicoDevice) android.os.Build.VERSION.RELEASE.takeIf { it.isNotEmpty() } else null

  override val deviceModel: String?
    get() = android.os.Build.MODEL.takeIf { it.isNotEmpty() }

  override val emulatorOptimizations: Boolean
    get() = BuildConfig.PICO_EMULATOR_OPTIMIZATIONS

  /**
   * Runtime initialisation flags.
   *
   * These report whether the corresponding runtime *class* is linked, not
   * whether it has been started — there is no init hook to observe under
   * Nitro, where HybridObjects are created lazily by JS rather than
   * registered at app start.
   */
  override val swanRuntimeInitialized: Boolean
    get() = xrMode == PicoXRMode.PICO_SWAN && PicoDevice.classPresent(SWAN_RUNTIME_CLASS)

  override val os5RuntimeInitialized: Boolean
    get() = xrMode == PicoXRMode.PICO_OS5 && PicoDevice.classPresent(OS5_RUNTIME_CLASS)

  override val platformSdkPresent: Boolean
    get() = PicoDevice.platformSdkPresent

  /**
   * There is no version string on the vendored Platform SDK AAR, so this
   * reports presence rather than inventing a number.
   */
  override val platformSdkVersion: String?
    get() = if (PicoDevice.platformSdkPresent) "present" else null

  override val declaredCapabilities: PicoDeclaredCapabilities
    get() = PicoDeclaredCapabilities(
      handTracking = BuildConfig.PICO_HAND_TRACKING,
      passthrough = BuildConfig.PICO_PASSTHROUGH,
      sceneUnderstanding = BuildConfig.PICO_SCENE_UNDERSTANDING,
      eyeTracking = BuildConfig.PICO_EYE_TRACKING,
      faceTracking = BuildConfig.PICO_FACE_TRACKING,
      bodyTracking = BuildConfig.PICO_BODY_TRACKING,
      spatialAudio = BuildConfig.PICO_SPATIAL_AUDIO,
      foveatedRendering = BuildConfig.PICO_FOVEATED_RENDERING,
      highSamplingRateSensors = BuildConfig.PICO_HIGH_SAMPLING_RATE_SENSORS,
      boundary = BuildConfig.PICO_BOUNDARY,
      sceneMesh = BuildConfig.PICO_SCENE_MESH,
      picoSenseController = BuildConfig.PICO_SENSE_CONTROLLER,
      motionTracker = BuildConfig.PICO_MOTION_TRACKER,
      controllerHaptics = BuildConfig.PICO_CONTROLLER_HAPTICS,
      openXrLoader = BuildConfig.PICO_OPENXR_LOADER,
      ndkAbiFilters = BuildConfig.PICO_NDK_ABI_FILTERS.isNotEmpty(),
      developerTools = BuildConfig.PICO_DEVELOPER_TOOLS,
      entitlementCheck = BuildConfig.PICO_ENTITLEMENT_CHECK,
    )

  override val declaredRefreshRates: DoubleArray
    get() = PicoDevice.splitList(BuildConfig.PICO_REFRESH_RATES)
      .mapNotNull { it.toDoubleOrNull() }
      .toDoubleArray()

  override val declaredTargetDevices: Array<String>
    get() = PicoDevice.splitList(BuildConfig.PICO_TARGET_DEVICES).toTypedArray()

  /**
   * Resolve this app's immersive activity, if it declares one.
   *
   * Matched on PICO's VR intent category rather than a class name, so it finds
   * whatever the renderer's config plugin generated — Viro's `.VRActivity`, or
   * an app's own. Restricted to this package: `queryIntentActivities` would
   * otherwise happily return the system launcher's VR entries.
   *
   * The legacy `com.picovr.` category is checked too, because devices still on
   * PICO OS 5 filter on that one.
   */
  private fun resolveImmersiveActivity(): Intent? {
    val context = PicoDevice.context() ?: return null
    val pm = context.packageManager
    for (category in IMMERSIVE_CATEGORIES) {
      val probe = Intent(Intent.ACTION_MAIN).addCategory(category).setPackage(context.packageName)
      val match = runCatching { pm.queryIntentActivities(probe, 0) }
        .getOrDefault(emptyList())
        .firstOrNull() ?: continue
      return Intent(Intent.ACTION_MAIN)
        .addCategory(category)
        .setClassName(context.packageName, match.activityInfo.name)
    }
    return null
  }

  /**
   * Finish the immersive activity, returning the user to the 2D panel.
   *
   * Guarded on the resumed Activity actually being the immersive one: this is
   * called from a back handler shared with the panel, and finishing whatever
   * happens to be in front would close the app instead.
   */
  override fun exitImmersiveScene(): Promise<Boolean> {
    val activity = PicoActivityHolder.currentActivity() ?: return Promise.resolved(false)
    val immersive = resolveImmersiveActivity()?.component?.className
      ?: return Promise.resolved(false)
    if (activity.componentName.className != immersive) return Promise.resolved(false)
    activity.finish()
    return Promise.resolved(true)
  }

  override fun hasImmersiveActivity(): Promise<Boolean> =
    Promise.resolved(resolveImmersiveActivity() != null)

  override fun enterImmersiveScene(): Promise<Boolean> {
    val context = PicoDevice.context() ?: return Promise.resolved(false)
    val intent = resolveImmersiveActivity() ?: return Promise.resolved(false)
    // Core holds an application Context, not an Activity, so NEW_TASK is
    // required. SINGLE_TOP keeps a re-entry from stacking a second copy.
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return Promise.resolved(runCatching { context.startActivity(intent) }.isSuccess)
  }

  override fun hasSystemFeature(name: String): Promise<Boolean> {
    val pm = PicoDevice.context()?.packageManager
      ?: return Promise.resolved(false)
    return Promise.resolved(runCatching { pm.hasSystemFeature(name) }.getOrDefault(false))
  }

  override fun getDeclaredFeatures(): Promise<Array<PicoDeclaredFeature>> {
    val context = PicoDevice.context() ?: return Promise.resolved(emptyArray())
    return Promise.parallel {
      val info = context.packageManager.getPackageInfo(
        context.packageName,
        PackageManager.GET_CONFIGURATIONS,
      )
      info.reqFeatures.orEmpty().mapNotNull { feature ->
        val name = feature.name
        if (name == null) {
          // A feature entry with no name is a GL-ES version requirement,
          // which the manifest expresses as a nameless <uses-feature>.
          PicoDeclaredFeature(
            name = "android.hardware.opengles.version",
            required = feature.isRequired,
            glEsVersion = feature.glEsVersion,
          )
        } else {
          PicoDeclaredFeature(name = name, required = feature.isRequired, glEsVersion = null)
        }
      }.toTypedArray()
    }
  }

  override fun getDeclaredPermissions(): Promise<Array<PicoDeclaredPermission>> {
    val context = PicoDevice.context() ?: return Promise.resolved(emptyArray())
    return Promise.parallel {
      val info = context.packageManager.getPackageInfo(
        context.packageName,
        PackageManager.GET_PERMISSIONS,
      )
      val names = info.requestedPermissions.orEmpty()
      val flags = info.requestedPermissionsFlags
      names.mapIndexed { index, name ->
        // REQUESTED_PERMISSION_GRANTED is on PackageInfo, not PackageManager.
        //
        // The null branch also has to default to 0 rather than ride the
        // safe-call: `flags?.get(i)?.and(MASK) != 0` is `null != 0` when flags
        // is absent, which is `true`, so every permission would report as
        // granted on a device that returns no flags array.
        val flag = flags?.getOrNull(index) ?: 0
        val granted = (flag and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0
        PicoDeclaredPermission(name = name, granted = granted)
      }.toTypedArray()
    }
  }

  override fun getPlatformSdkProbe(): Promise<Map<String, Boolean>> =
    Promise.resolved(PicoDevice.platformSdkProbe())

  /**
   * Joins the three sources for every capability at once.
   *
   * `fullyAvailable` is the only field an app should gate on: a capability
   * is usable when it was declared at build time, the device reports the
   * system feature, and the SDK class that drives it is linked. Any one of
   * those alone is a half-answer.
   */
  override fun getCapabilitySnapshot(): Promise<Array<PicoCapabilitySnapshotEntry>> {
    val pm = PicoDevice.context()?.packageManager
    return Promise.parallel {
      PicoCapabilityName.entries.map { name -> snapshot(name, pm) }.toTypedArray()
    }
  }

  override fun isCapabilityAvailable(name: PicoCapabilityName): Promise<Boolean?> {
    val pm = PicoDevice.context()?.packageManager
    return Promise.parallel { snapshot(name, pm).fullyAvailable }
  }

  private fun snapshot(
    name: PicoCapabilityName,
    pm: PackageManager?,
  ): PicoCapabilitySnapshotEntry {
    val declared = name.declaredIn(declaredCapabilities)
    val feature = name.systemFeature
    val featureAvailable = feature?.let { f ->
      pm?.let { runCatching { it.hasSystemFeature(f) }.getOrDefault(false) }
    }
    val sdkClass = name.sdkClass
    val sdkAvailable = sdkClass?.let { PicoDevice.classPresent(it) } ?: true
    return PicoCapabilitySnapshotEntry(
      name = name,
      declared = declared,
      systemFeature = feature,
      systemFeatureAvailable = featureAvailable,
      sdkClassFound = sdkClass,
      sdkAvailable = sdkAvailable,
      // A capability with no system feature to check (developer tools,
      // entitlement) is available whenever it was declared and its SDK is
      // linked; requiring a feature that does not exist would make it
      // permanently unavailable.
      fullyAvailable = declared && (featureAvailable ?: true) && sdkAvailable,
    )
  }

  /** `FeatureInfo.flags` carries the required bit; there is no accessor. */
  private val FeatureInfo.isRequired: Boolean
    get() = (flags and FeatureInfo.FLAG_REQUIRED) != 0

  private companion object {
    /** PICO's VR intent categories, current first then the OS 5 legacy name. */
    private val IMMERSIVE_CATEGORIES = listOf(
      "com.pico.intent.category.VR",
      "com.picovr.intent.category.VR",
    )

    const val SWAN_RUNTIME_CLASS = "expo.modules.pico.swan.PicoSwanRuntime"
    const val OS5_RUNTIME_CLASS = "expo.modules.pico.os5.PicoOs5Runtime"

    /**
     * The manifest feature each capability corresponds to, or null where
     * PICO declares none. Names match the `PICO_FEATURES` table in
     * `plugin/src/constants.ts` — the plugin writes them, this reads them
     * back, and they have to agree.
     */
    val PicoCapabilityName.systemFeature: String?
      get() = when (this) {
        PicoCapabilityName.HANDTRACKING -> "picovr.software.hand_tracking"
        PicoCapabilityName.PASSTHROUGH -> "picovr.software.seethrough"
        PicoCapabilityName.SCENEUNDERSTANDING -> "picovr.software.scene_understanding"
        PicoCapabilityName.EYETRACKING -> "picovr.software.eye_tracking"
        PicoCapabilityName.FACETRACKING -> "picovr.software.face_tracking"
        PicoCapabilityName.BODYTRACKING -> "picovr.software.body_tracking"
        PicoCapabilityName.BOUNDARY -> "picovr.software.boundary"
        PicoCapabilityName.SCENEMESH -> "picovr.software.scene_mesh"
        PicoCapabilityName.PICOSENSECONTROLLER -> "picovr.software.sense_controller"
        PicoCapabilityName.MOTIONTRACKER -> "picovr.software.motion_tracker"
        PicoCapabilityName.SPATIALAUDIO,
        PicoCapabilityName.FOVEATEDRENDERING,
        PicoCapabilityName.HIGHSAMPLINGRATESENSORS,
        PicoCapabilityName.CONTROLLERHAPTICS,
        PicoCapabilityName.OPENXRLOADER,
        PicoCapabilityName.DEVELOPERTOOLS,
        PicoCapabilityName.ENTITLEMENTCHECK -> null
      }

    /**
     * The SDK class that has to be linked for the capability to work.
     * Null where the capability needs no SDK beyond the OpenXR loader.
     */
    val PicoCapabilityName.sdkClass: String?
      get() = when (this) {
        PicoCapabilityName.HANDTRACKING,
        PicoCapabilityName.EYETRACKING,
        PicoCapabilityName.FACETRACKING,
        PicoCapabilityName.BODYTRACKING,
        PicoCapabilityName.SCENEUNDERSTANDING,
        PicoCapabilityName.SCENEMESH,
        PicoCapabilityName.BOUNDARY,
        PicoCapabilityName.MOTIONTRACKER,
        PicoCapabilityName.PICOSENSECONTROLLER,
        PicoCapabilityName.CONTROLLERHAPTICS,
        PicoCapabilityName.PASSTHROUGH -> "com.picovr.picovrlib.PXR_Plugin"
        PicoCapabilityName.ENTITLEMENTCHECK -> "com.pico.pps.sdk.entitlement.PicoEntitlementClient"
        PicoCapabilityName.SPATIALAUDIO,
        PicoCapabilityName.FOVEATEDRENDERING,
        PicoCapabilityName.HIGHSAMPLINGRATESENSORS,
        PicoCapabilityName.OPENXRLOADER,
        PicoCapabilityName.DEVELOPERTOOLS -> null
      }

    fun PicoCapabilityName.declaredIn(caps: PicoDeclaredCapabilities): Boolean = when (this) {
      PicoCapabilityName.HANDTRACKING -> caps.handTracking
      PicoCapabilityName.PASSTHROUGH -> caps.passthrough
      PicoCapabilityName.SCENEUNDERSTANDING -> caps.sceneUnderstanding
      PicoCapabilityName.EYETRACKING -> caps.eyeTracking
      PicoCapabilityName.FACETRACKING -> caps.faceTracking
      PicoCapabilityName.BODYTRACKING -> caps.bodyTracking
      PicoCapabilityName.SPATIALAUDIO -> caps.spatialAudio
      PicoCapabilityName.FOVEATEDRENDERING -> caps.foveatedRendering
      PicoCapabilityName.HIGHSAMPLINGRATESENSORS -> caps.highSamplingRateSensors
      PicoCapabilityName.BOUNDARY -> caps.boundary
      PicoCapabilityName.SCENEMESH -> caps.sceneMesh
      PicoCapabilityName.PICOSENSECONTROLLER -> caps.picoSenseController
      PicoCapabilityName.MOTIONTRACKER -> caps.motionTracker
      PicoCapabilityName.CONTROLLERHAPTICS -> caps.controllerHaptics
      PicoCapabilityName.OPENXRLOADER -> caps.openXrLoader
      PicoCapabilityName.DEVELOPERTOOLS -> caps.developerTools
      PicoCapabilityName.ENTITLEMENTCHECK -> caps.entitlementCheck
    }
  }
}
