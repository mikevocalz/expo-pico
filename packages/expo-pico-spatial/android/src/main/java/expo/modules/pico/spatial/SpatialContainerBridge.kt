package expo.modules.pico.spatial

import android.app.Activity
import android.content.Context
import android.util.Log
import com.pico.spatial.core.platform.SpatialBuild
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Owns every PICO Spatial SDK 6 call (SDK container calls go through the Java
 * SpatialContainerCalls shim). PicoSpatialV2 calls in here so its own class
 * never links against SDK classes, which are compileOnly
 * and absent from the APK unless the app sets `enableSpatialSdk: true`.
 *
 * Every SDK touch is wrapped in runCatching, which catches Throwable: on PICO
 * OS 5 the AARs can be on the classpath while the OS 6 framework classes they
 * call (com.spatial.app.*, android.app.SpaceContext) are not, and that fails
 * with NoClassDefFoundError / LinkageError rather than an Exception.
 */
internal object SpatialContainerBridge {
  private const val TAG = "ExpoPicoSpatial"
  private const val CONTAINER_MANAGER_CLASS = "com.pico.spatial.core.container.SpatialContainerManager"
  private const val SPATIAL_BUILD_CLASS = "com.pico.spatial.core.platform.SpatialBuild"

  data class Status(val sdkLinked: Boolean, val spatialPlatform: Boolean, val reason: String?) {
    val ready: Boolean
      get() = sdkLinked && spatialPlatform
  }

  private val reasonLogged = AtomicBoolean(false)

  @Volatile
  var lastError: String? = null
    private set

  /** Platform and classpath can't change while the process runs, so this is computed once. */
  val status: Status by lazy { computeStatus() }

  private fun classOnClasspath(name: String): Boolean =
    runCatching { Class.forName(name, false, SpatialContainerBridge::class.java.classLoader) }.isSuccess

  private fun computeStatus(): Status {
    if (!classOnClasspath(CONTAINER_MANAGER_CLASS) || !classOnClasspath(SPATIAL_BUILD_CLASS)) {
      return Status(
        sdkLinked = false,
        spatialPlatform = false,
        reason = "SPATIAL_SDK_NOT_LINKED: com.pico.spatial.core:core is not in this APK. " +
          "Set enableSpatialSdk: true on the @expo-pico/spatial config plugin and build a pico flavor.",
      )
    }
    val platform = runCatching { SpatialBuild.isSpatialPlatform() }
    val failure = platform.exceptionOrNull()
    if (failure != null) {
      return Status(
        sdkLinked = true,
        spatialPlatform = false,
        reason = "SPATIAL_PLATFORM_CHECK_FAILED: ${failure.javaClass.name}: ${failure.message}",
      )
    }
    if (platform.getOrDefault(false) != true) {
      return Status(
        sdkLinked = true,
        spatialPlatform = false,
        reason = "NOT_SPATIAL_PLATFORM: SpatialBuild.isSpatialPlatform() is false. " +
          "WindowContainers need PICO OS 6.",
      )
    }
    return Status(sdkLinked = true, spatialPlatform = true, reason = null)
  }

  private fun rejectUnlessReady(what: String): Boolean {
    val current = status
    if (current.ready) return false
    if (reasonLogged.compareAndSet(false, true)) {
      Log.w(TAG, "$what rejected: ${current.reason}")
    }
    return true
  }

  private fun recordFailure(what: String, error: Throwable) {
    val message = "$what failed: ${error.javaClass.name}: ${error.message}"
    lastError = message
    Log.w(TAG, message, error)
  }

  /**
   * Opens a WindowContainer named [id] that hosts [target]. The SDK call is
   * void, so `true` means it returned without throwing, not that the OS has
   * finished showing the window.
   */
  fun openWindowContainer(
    context: Context,
    id: String,
    target: Class<out Activity>,
    tag: String?,
  ): Boolean {
    if (rejectUnlessReady("openWindowContainer")) return false
    val result = runCatching { SpatialContainerCalls.openWindowContainer(context, id, target, tag) }
    result.exceptionOrNull()?.let { recordFailure("openWindowContainer('$id')", it) }
    return result.isSuccess
  }

  fun closeWindowContainer(id: String, tag: String?): Boolean {
    if (rejectUnlessReady("closeWindowContainer")) return false
    val result = runCatching { SpatialContainerCalls.closeWindowContainer(id, tag) }
    result.exceptionOrNull()?.let { recordFailure("closeWindowContainer('$id')", it) }
    return result.isSuccess
  }
}
