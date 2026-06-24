package expo.modules.pico.account

import android.os.Build
import expo.modules.pico.PicoPlatformSdkDetector

/**
 * Availability + version probes for the PICO Platform account surface.
 *
 * Phase L canary: version reporting delegates to the shared
 * `PicoPlatformSdkDetector` in `expo-pico-core`. The presence probe
 * stays inline here because it names the account-specific entry
 * class, while the shared detector's broad probe covers every sibling.
 *
 * Other siblings can migrate their version reporting to the shared
 * detector in follow-up PRs once this canary is validated on a real
 * device — see `docs/DEVICE-TESTING-REQUIRED.md`.
 *
 * Rollback: if the Gradle `implementation project(':expo-pico-core')`
 * line in this package's `android/build.gradle` doesn't resolve under
 * a given Expo Modules autolinking configuration, revert that line
 * and drop back to a local inline version reader. The account module
 * continues to work — `SERVICE_UNAVAILABLE` is still reported
 * correctly; only the version string degrades to `"unavailable"`.
 */
object AccountUtils {

    /**
     * Probes the PICO Platform SDK account entry class.
     *
     * Extension seam: the class name is a best-known pattern from the
     * PICO Platform Service integration guide. Replace with the
     * canonical entry point when it's confirmed.
     */
    fun isPlatformSdkAvailable(): Boolean {
        // Probe every PICO Platform SDK variant we know about so the seam
        // flips green regardless of which AAR the consumer dropped in
        // `android/app/libs/`:
        //
        //   - `com.pico.platform.PlatformServiceSDK` — current SDK 3.x line
        //     (https://developer.picoxr.com/document/platform_service/).
        //     This is what `expo.modules.pico.PicoPlatformSDK` initializes.
        //   - `com.pico.platform.UserService`        — SDK 3.x account API.
        //   - `com.pvr.platform.sdk.PlatformSDK`     — legacy SDK 2.x.
        //   - `com.pico.pps.sdk.auth.PicoSignInClient` — older PPS auth path.
        //   - `com.bytedance.pico.matrix.action.AuthAction` — current matrix
        //     auth action published on Bytedance Volcengine maven.
        return PicoPlatformSdkDetector.probeAny(
            "com.pico.platform.PlatformServiceSDK",
            "com.pico.platform.UserService",
            "com.pvr.platform.sdk.PlatformSDK",
            "com.pico.pps.sdk.auth.PicoSignInClient",
            "com.bytedance.pico.matrix.action.AuthAction",
        )
    }

    /**
     * Phase L canary — delegates to the shared detector. Returns null
     * when the SDK isn't on the classpath or the version field can't
     * be read. The JS side renders null as `'unavailable'`.
     */
    fun getPlatformSdkVersion(): String? {
        return PicoPlatformSdkDetector.readVersion()
    }

    fun isPicoDevice(): Boolean =
        Build.MANUFACTURER.equals("Pico", ignoreCase = true) ||
        Build.BRAND.equals("PICO", ignoreCase = true)
}
