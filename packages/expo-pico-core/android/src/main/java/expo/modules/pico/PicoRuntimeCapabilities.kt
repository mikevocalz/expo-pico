package expo.modules.pico

import android.content.Context
import android.content.pm.FeatureInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build

/**
 * Runtime inspection of the app's own declared manifest features and
 * granted permissions, plus system feature queries against the device.
 *
 * Used by the JS-side `getPicoDiagnostics()` to compare what the config
 * plugin *declared* at build time (via BuildConfig fields and the
 * PICO-flavor AndroidManifest) against what the device actually reports
 * at runtime. The comparison catches cases like:
 *
 *   - App declared `pico.hardware.eyetracking` but the device lacks it.
 *   - App declared `pvr.app.type = vr` but `targetSdkVersion >= 31` apps
 *     that fail to declare the OpenXR loader native library silently
 *     fall back to the system loader.
 *   - App requested `RECORD_AUDIO` but the user has not granted it.
 *
 * All methods are read-only and safe on any Android API level (uses
 * version-gated PackageManager flags).
 */
internal object PicoRuntimeCapabilities {

    /**
     * @return true if the Android system reports that the given feature
     *   name is available on the running device. Wraps
     *   `PackageManager.hasSystemFeature(name)`. Returns false on any
     *   SecurityException / null-PM — defensive rather than crashing.
     */
    fun hasSystemFeature(context: Context, name: String): Boolean {
        return try {
            context.packageManager.hasSystemFeature(name)
        } catch (_: Throwable) {
            false
        }
    }

    /**
     * @return the list of `<uses-feature>` entries declared in this app's
     *   merged AndroidManifest. Each entry is a map with `name`,
     *   `required`, and `glEsVersion` (the latter only populated for
     *   glEs features). Useful for confirming that the Phase A/C/D
     *   declarations actually landed after manifest merging.
     */
    fun getDeclaredFeatures(context: Context): List<Map<String, Any?>> {
        return try {
            val pm = context.packageManager
            val info: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_CONFIGURATIONS.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                pm.getPackageInfo(context.packageName, PackageManager.GET_CONFIGURATIONS)
            }
            val features: Array<FeatureInfo> = info.reqFeatures ?: emptyArray()
            features.map { f ->
                buildMap<String, Any?> {
                    put("name", f.name ?: "")
                    put(
                        "required",
                        (f.flags and FeatureInfo.FLAG_REQUIRED) == FeatureInfo.FLAG_REQUIRED
                    )
                    if (f.reqGlEsVersion != 0) {
                        put("glEsVersion", String.format("0x%08x", f.reqGlEsVersion))
                    }
                }
            }
        } catch (_: Throwable) {
            emptyList()
        }
    }

    /**
     * @return the list of permissions this app declares in its manifest,
     *   paired with whether each is currently granted. For normal
     *   permissions the granted flag is always true; for dangerous /
     *   runtime permissions it reflects the actual runtime state.
     */
    fun getDeclaredPermissions(context: Context): List<Map<String, Any?>> {
        return try {
            val pm = context.packageManager
            val info: PackageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                pm.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                pm.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
            }
            val declared = info.requestedPermissions ?: emptyArray()
            declared.map { perm ->
                mapOf(
                    "name" to perm,
                    "granted" to (
                        pm.checkPermission(perm, context.packageName) ==
                            PackageManager.PERMISSION_GRANTED
                    )
                )
            }
        } catch (_: Throwable) {
            emptyList()
        }
    }
}
