package expo.modules.pico.spatial

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo Module for PICO spatial runtime APIs.
 *
 * Exposes spatial state as constants resolved at module init time.
 * The heavy-weight spatial APIs (anchor creation, space transitions,
 * WindowContainer management) are extension seams — they require
 * PICO Spatial SDK AAR bindings that are declared but not yet implemented.
 *
 * @see https://developer.picoxr.com/document/spatial-sdk/
 */
class ExpoPicoSpatialModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoPicoSpatial")

        Constants(
            "spaceState" to SpatialDeviceUtils.detectSpaceState(),
            "containerType" to SpatialDeviceUtils.detectContainerType(),
            "spatialSdkVersion" to SpatialDeviceUtils.getSpatialSdkVersion(),
            "capabilities" to mapOf(
                "spaceStates" to SpatialDeviceUtils.supportsSpaceStates(),
                "spatialAnchors" to SpatialDeviceUtils.supportsSpatialAnchors(),
                "sceneUnderstanding" to SpatialDeviceUtils.supportsSceneUnderstanding(),
                "passthrough" to SpatialDeviceUtils.supportsPassthrough(),
                "handTracking" to SpatialDeviceUtils.supportsHandTracking(),
                "spatialSdkAvailable" to SpatialDeviceUtils.isSpatialSdkAvailable()
            )
        )

        // Extension seam: createSpatialAnchor
        // When PICO Spatial SDK bindings are available, implement:
        //   AsyncFunction("createSpatialAnchor") { pose: Map<String, Any> -> ... }
        //
        // Extension seam: setWindowContainerProperties
        //   AsyncFunction("setWindowContainerProperties") { props: Map<String, Any> -> ... }
        //
        // Extension seam: requestFullSpace
        //   AsyncFunction("requestFullSpace") { -> ... }
    }
}
