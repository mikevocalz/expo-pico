package expo.modules.pico

import android.content.Intent
import android.content.pm.FeatureInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import io.github.expo.modules.v2.ExpoModule
import io.github.expo.modules.v2.JS
import io.github.expo.modules.v2.Module
import io.github.expo.modules.v2.react.currentActivity
import io.github.expo.modules.v2.react.reactContextOrNull

@ExpoModule
object PicoCoreV2 : Module() {
  private fun classPresent(name: String): Boolean =
    runCatching { Class.forName(name); true }.getOrDefault(false)

  private fun splitList(value: String): List<String> =
    value.split(',').map(String::trim).filter(String::isNotEmpty)

  private fun isPicoDevice(): Boolean {
    val pm = reactContextOrNull?.packageManager ?: return false
    return DEVICE_FEATURES.any { runCatching { pm.hasSystemFeature(it) }.getOrDefault(false) }
  }

  private fun platformSdkProbe(): Map<String, Boolean> =
    PLATFORM_SDK_PROBES.mapValues { (_, value) -> classPresent(value) }

  private fun declaredCapabilities(): Map<String, Boolean> = mapOf(
    "handTracking" to BuildConfig.PICO_HAND_TRACKING,
    "passthrough" to BuildConfig.PICO_PASSTHROUGH,
    "sceneUnderstanding" to BuildConfig.PICO_SCENE_UNDERSTANDING,
    "eyeTracking" to BuildConfig.PICO_EYE_TRACKING,
    "faceTracking" to BuildConfig.PICO_FACE_TRACKING,
    "bodyTracking" to BuildConfig.PICO_BODY_TRACKING,
    "spatialAudio" to BuildConfig.PICO_SPATIAL_AUDIO,
    "foveatedRendering" to BuildConfig.PICO_FOVEATED_RENDERING,
    "highSamplingRateSensors" to BuildConfig.PICO_HIGH_SAMPLING_RATE_SENSORS,
    "boundary" to BuildConfig.PICO_BOUNDARY,
    "sceneMesh" to BuildConfig.PICO_SCENE_MESH,
    "picoSenseController" to BuildConfig.PICO_SENSE_CONTROLLER,
    "motionTracker" to BuildConfig.PICO_MOTION_TRACKER,
    "controllerHaptics" to BuildConfig.PICO_CONTROLLER_HAPTICS,
    "openXrLoader" to BuildConfig.PICO_OPENXR_LOADER,
    "ndkAbiFilters" to BuildConfig.PICO_NDK_ABI_FILTERS.isNotEmpty(),
    "developerTools" to BuildConfig.PICO_DEVELOPER_TOOLS,
    "entitlementCheck" to BuildConfig.PICO_ENTITLEMENT_CHECK,
  )

  @JS
  fun getInfo(): Map<String, Any?> {
    val probe = platformSdkProbe()
    return mapOf(
      "apiVersion" to 2,
      "isPicoBuild" to (BuildConfig.PICO_XR_MODE != "mobile"),
      "isPicoDevice" to isPicoDevice(),
      "spatialMode" to BuildConfig.PICO_SPATIAL_MODE,
      "containerMode" to BuildConfig.PICO_CONTAINER_MODE,
      "targetProfile" to BuildConfig.PICO_TARGET_PROFILE.ifEmpty { "unknown" },
      "xrMode" to BuildConfig.PICO_XR_MODE.ifEmpty { "mobile" },
      "appType" to BuildConfig.PICO_APP_TYPE.ifEmpty { "2d" },
      "picoAppId" to BuildConfig.PICO_APP_ID.takeIf(String::isNotEmpty),
      "picoAppKey" to BuildConfig.PICO_APP_KEY.takeIf(String::isNotEmpty),
      "hasPlatformIdentity" to BuildConfig.PICO_HAS_PLATFORM_IDENTITY,
      "hasIapIdentity" to BuildConfig.PICO_HAS_IAP_IDENTITY,
      "picoOsVersion" to android.os.Build.VERSION.RELEASE.takeIf { isPicoDevice() && it.isNotEmpty() },
      "deviceModel" to android.os.Build.MODEL.takeIf(String::isNotEmpty),
      "emulatorOptimizations" to BuildConfig.PICO_EMULATOR_OPTIMIZATIONS,
      "swanRuntimeInitialized" to (
        BuildConfig.PICO_XR_MODE == "pico-swan" && classPresent(SWAN_RUNTIME_CLASS)
      ),
      "os5RuntimeInitialized" to (
        BuildConfig.PICO_XR_MODE == "pico-os5" && classPresent(OS5_RUNTIME_CLASS)
      ),
      "platformSdkPresent" to probe.values.any { it },
      "platformSdkVersion" to if (probe.values.any { it }) "present" else null,
    )
  }

  @JS
  fun getDeclaredCapabilities(): Map<String, Boolean> = declaredCapabilities()

  @JS
  fun getDeclaredRefreshRates(): List<Double> =
    splitList(BuildConfig.PICO_REFRESH_RATES).mapNotNull(String::toDoubleOrNull)

  @JS
  fun getDeclaredTargetDevices(): List<String> = splitList(BuildConfig.PICO_TARGET_DEVICES)

  @JS
  fun getPlatformSdkProbe(): Map<String, Boolean> = platformSdkProbe()

  @JS
  fun hasSystemFeature(name: String): Boolean =
    reactContextOrNull?.packageManager?.let { runCatching { it.hasSystemFeature(name) }.getOrDefault(false) } ?: false

  @JS
  fun getDeclaredFeatures(): List<Map<String, Any?>> {
    val context = reactContextOrNull ?: return emptyList()
    val info = context.packageManager.getPackageInfo(
      context.packageName,
      PackageManager.GET_CONFIGURATIONS,
    )
    return info.reqFeatures.orEmpty().map { feature ->
      if (feature.name == null) {
        mapOf(
          "name" to "android.hardware.opengles.version",
          "required" to feature.isRequired,
          "glEsVersion" to feature.glEsVersion,
        )
      } else {
        mapOf(
          "name" to feature.name,
          "required" to feature.isRequired,
          "glEsVersion" to null,
        )
      }
    }
  }

  @JS
  fun getDeclaredPermissions(): List<Map<String, Any>> {
    val context = reactContext ?: return emptyList()
    val info = context.packageManager.getPackageInfo(
      context.packageName,
      PackageManager.GET_PERMISSIONS,
    )
    val flags = info.requestedPermissionsFlags
    return info.requestedPermissions.orEmpty().mapIndexed { index, name ->
      val flag = flags?.getOrNull(index) ?: 0
      mapOf(
        "name" to name,
        "granted" to ((flag and PackageInfo.REQUESTED_PERMISSION_GRANTED) != 0),
      )
    }
  }

  @JS
  fun getCapabilitySnapshot(): List<Map<String, Any?>> {
    val declared = declaredCapabilities()
    val pm = reactContextOrNull?.packageManager
    return CAPABILITIES.map { cap ->
      val featureAvailable = cap.feature?.let { feature ->
        pm?.let { runCatching { it.hasSystemFeature(feature) }.getOrDefault(false) }
      }
      val sdkAvailable = cap.sdkClass?.let(::classPresent) ?: true
      val isDeclared = declared[cap.key] == true
      mapOf(
        "name" to cap.key,
        "declared" to isDeclared,
        "systemFeature" to cap.feature,
        "systemFeatureAvailable" to featureAvailable,
        "sdkClassFound" to cap.sdkClass,
        "sdkAvailable" to sdkAvailable,
        "fullyAvailable" to (isDeclared && (featureAvailable ?: true) && sdkAvailable),
      )
    }
  }

  @JS
  fun isCapabilityAvailable(name: String): Boolean? =
    getCapabilitySnapshot().firstOrNull { it["name"] == name }?.get("fullyAvailable") as? Boolean

  private fun immersiveIntent(): Intent? {
    val context = reactContext ?: return null
    val pm = context.packageManager
    IMMERSIVE_CATEGORIES.forEach { category ->
      val probe = Intent(Intent.ACTION_MAIN).addCategory(category).setPackage(context.packageName)
      val match = runCatching { pm.queryIntentActivities(probe, 0) }
        .getOrDefault(emptyList())
        .firstOrNull() ?: return@forEach
      return Intent(Intent.ACTION_MAIN)
        .addCategory(category)
        .setClassName(context.packageName, match.activityInfo.name)
    }
    return null
  }

  @JS
  fun hasImmersiveActivity(): Boolean = immersiveIntent() != null

  @JS
  fun enterImmersiveScene(): Boolean {
    val context = reactContextOrNull ?: return false
    val intent = immersiveIntent() ?: return false
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return runCatching { context.startActivity(intent) }.isSuccess
  }

  @JS
  fun exitImmersiveScene(): Boolean {
    val activity = reactContextOrNull?.currentActivity ?: return false
    val immersive = immersiveIntent()?.component?.className ?: return false
    if (activity.componentName.className != immersive) return false
    activity.finish()
    return true
  }

  private val FeatureInfo.isRequired: Boolean
    get() = (flags and FeatureInfo.FLAG_REQUIRED) != 0

  private data class Capability(val key: String, val feature: String?, val sdkClass: String?)

  private val CAPABILITIES = listOf(
    Capability("handTracking", "picovr.software.hand_tracking", PXR_PLUGIN_CLASS),
    Capability("passthrough", "picovr.software.seethrough", PXR_PLUGIN_CLASS),
    Capability("sceneUnderstanding", "picovr.software.scene_understanding", PXR_PLUGIN_CLASS),
    Capability("eyeTracking", "picovr.software.eye_tracking", PXR_PLUGIN_CLASS),
    Capability("faceTracking", "picovr.software.face_tracking", PXR_PLUGIN_CLASS),
    Capability("bodyTracking", "picovr.software.body_tracking", PXR_PLUGIN_CLASS),
    Capability("spatialAudio", null, null),
    Capability("foveatedRendering", null, null),
    Capability("highSamplingRateSensors", null, null),
    Capability("boundary", "picovr.software.boundary", PXR_PLUGIN_CLASS),
    Capability("sceneMesh", "picovr.software.scene_mesh", PXR_PLUGIN_CLASS),
    Capability("picoSenseController", "picovr.software.sense_controller", PXR_PLUGIN_CLASS),
    Capability("motionTracker", "picovr.software.motion_tracker", PXR_PLUGIN_CLASS),
    Capability("controllerHaptics", null, PXR_PLUGIN_CLASS),
    Capability("openXrLoader", null, null),
    Capability("developerTools", null, null),
    Capability("entitlementCheck", null, "com.pico.pps.sdk.entitlement.PicoEntitlementClient"),
  )

  private const val PXR_PLUGIN_CLASS = "com.picovr.picovrlib.PXR_Plugin"
  private const val SWAN_RUNTIME_CLASS = "expo.modules.pico.swan.PicoSwanRuntime"
  private const val OS5_RUNTIME_CLASS = "expo.modules.pico.os5.PicoOs5Runtime"

  private val DEVICE_FEATURES = listOf("com.pico.device", "picovr.software.vr_mode")
  private val IMMERSIVE_CATEGORIES = listOf(
    "com.pico.intent.category.VR",
    "com.picovr.intent.category.VR",
  )
  private val PLATFORM_SDK_PROBES = mapOf(
    "loginPaySdk" to "com.pico.loginpaysdk.UnityAuthInterface",
    "browser" to "com.pico.loginpaysdk.component.PicoSDKBrowser",
    "pxrPlugin" to PXR_PLUGIN_CLASS,
  )
}
