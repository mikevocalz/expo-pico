package expo.modules.pico

/**
 * Phase K — eye / face / body / hand tracking surfaces.
 *
 * All four are reflection-gated to PICO's `cvinterface` SDK (sometimes
 * also distributed under `tobsupport`). Each `enable*` call returns true
 * when the underlying API call succeeded; each `get*` call returns null
 * when the SDK is unavailable, the tracker hasn't been started, or the
 * device doesn't have the hardware.
 *
 * Data shape: every tracker reports a stable map shape per call so JS
 * code can destructure without per-SDK-version branching. Keys missing
 * from the SDK output are reported as null. Unknown extra keys from
 * future SDK versions are dropped.
 *
 * Hardware coverage:
 *   - Eye tracking:  PICO 4 Pro, 4 Enterprise, 4 Ultra (not on PICO 4 base)
 *   - Face tracking: PICO 4 Pro, 4 Enterprise (upper + lower face)
 *   - Body tracking: PICO Motion Tracker accessories (waist + foot dongles)
 *   - Hand tracking: PICO 4 / 4 Pro / 4 Ultra / Swan (XR_EXT_hand_tracking)
 *
 * Consumer pattern:
 *
 *     if (PicoTrackingRuntime.enableEyeTracking()) {
 *       val pose = PicoTrackingRuntime.getEyePose() ?: return
 *       // pose["leftGazeOrigin"] = listOf(x, y, z), etc.
 *     }
 */
internal object PicoTrackingRuntime {

    private val EYE_TRACKING_CANDIDATES = arrayOf(
        "com.picovr.cvinterface.PXR_EyeTracking",
        "com.pvr.eyetracking.EyeTrackingApi",
        "com.picoxr.tobsupport.eyetracking.EyeTracker",
    )

    private val FACE_TRACKING_CANDIDATES = arrayOf(
        "com.picovr.cvinterface.PXR_FaceTracking",
        "com.pvr.facetracking.FaceTrackingApi",
        "com.picoxr.tobsupport.facetracking.FaceTracker",
    )

    private val BODY_TRACKING_CANDIDATES = arrayOf(
        "com.picovr.cvinterface.PXR_MotionTracker",
        "com.pvr.bodytracking.BodyTrackingApi",
    )

    private val HAND_TRACKING_CANDIDATES = arrayOf(
        "com.picovr.handtracking.PXRHandTrackingApi",
        "com.pvr.handtracking.HandTrackingApi",
        "com.picoxr.tobsupport.handtracking.HandTracker",
    )

    // ── Eye tracking ────────────────────────────────────────────────

    /**
     * Resolve and call the SDK's eye-tracking start hook (`startEyeTracking`,
     * `start`, or `setEnabled(true)` depending on SDK version). Returns
     * true when one of them succeeded.
     */
    fun enableEyeTracking(): Boolean = tryStart(EYE_TRACKING_CANDIDATES)

    /**
     * Stop the eye tracker. Returns true when the stop hook was called.
     */
    fun disableEyeTracking(): Boolean = tryStop(EYE_TRACKING_CANDIDATES)

    /**
     * @return current gaze pose, or null when unavailable. Stable shape:
     *   - `leftGazeOrigin`:    [x, y, z] float meters
     *   - `leftGazeDirection`: [x, y, z] unit vector
     *   - `rightGazeOrigin`:   [x, y, z]
     *   - `rightGazeDirection`: [x, y, z]
     *   - `leftOpenness`:  Float 0..1 (0 = closed, 1 = open)
     *   - `rightOpenness`: Float 0..1
     *   - `leftPupilDiameterMm`:  Float
     *   - `rightPupilDiameterMm`: Float
     */
    fun getEyePose(): Map<String, Any?>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*EYE_TRACKING_CANDIDATES) ?: return null
        return readPoseFields(
            cls,
            keys = arrayOf(
                "leftGazeOrigin", "leftGazeDirection",
                "rightGazeOrigin", "rightGazeDirection",
                "leftOpenness", "rightOpenness",
                "leftPupilDiameterMm", "rightPupilDiameterMm",
            )
        )
    }

    // ── Face tracking ───────────────────────────────────────────────

    fun enableFaceTracking(): Boolean = tryStart(FACE_TRACKING_CANDIDATES)
    fun disableFaceTracking(): Boolean = tryStop(FACE_TRACKING_CANDIDATES)

    /**
     * @return upper + lower face blendshape weights, or null. Each weight
     *   is 0..1. Keys follow PICO's blendshape naming (e.g.
     *   `JawOpen`, `EyeBlinkLeft`, `MouthSmileRight`). Empty map when the
     *   tracker hasn't been started.
     */
    fun getFaceWeights(): Map<String, Any?>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*FACE_TRACKING_CANDIDATES) ?: return null
        return invokeNoArg(cls, "getBlendShapeWeights") as? Map<String, Any?>
            ?: invokeNoArg(cls, "getFaceBlendShapeWeights") as? Map<String, Any?>
            ?: invokeNoArg(cls, "getFaceWeights") as? Map<String, Any?>
            ?: emptyMap()
    }

    // ── Body tracking ───────────────────────────────────────────────

    fun enableBodyTracking(): Boolean = tryStart(BODY_TRACKING_CANDIDATES)
    fun disableBodyTracking(): Boolean = tryStop(BODY_TRACKING_CANDIDATES)

    /**
     * @return list of body-tracking joint poses, or null. Each entry:
     *   - `joint`:    String (e.g. "Hip", "LeftAnkle", "RightWrist")
     *   - `position`: [x, y, z] float meters in tracking-space
     *   - `rotation`: [x, y, z, w] quaternion
     *   - `confidence`: Float 0..1 (-1 when unknown)
     */
    fun getBodyJoints(): List<Map<String, Any?>>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*BODY_TRACKING_CANDIDATES) ?: return null
        @Suppress("UNCHECKED_CAST")
        return (
            invokeNoArg(cls, "getBodyJoints") as? List<Map<String, Any?>>
                ?: invokeNoArg(cls, "getJointPoses") as? List<Map<String, Any?>>
                ?: emptyList<Map<String, Any?>>()
        )
    }

    // ── Hand tracking ───────────────────────────────────────────────

    fun enableHandTracking(): Boolean = tryStart(HAND_TRACKING_CANDIDATES)
    fun disableHandTracking(): Boolean = tryStop(HAND_TRACKING_CANDIDATES)

    /**
     * @return per-hand joint poses (left + right), or null when SDK is
     *   absent. Stable shape:
     *   - `leftHand`:  Map { joints: List<{position, rotation}>, confidence: Float }
     *   - `rightHand`: same shape
     *   - `aimEnabled`: Boolean (true when hand-aim is being used as the
     *     active pointer, false when controllers are active)
     */
    fun getHandPose(): Map<String, Any?>? {
        val cls = PicoPlatformSdkDetector.findAvailable(*HAND_TRACKING_CANDIDATES) ?: return null
        @Suppress("UNCHECKED_CAST")
        return invokeNoArg(cls, "getHandPose") as? Map<String, Any?>
            ?: invokeNoArg(cls, "getHandJoints") as? Map<String, Any?>
            ?: emptyMap<String, Any?>()
    }

    // ── Reflection helpers ──────────────────────────────────────────

    private fun tryStart(candidates: Array<String>): Boolean {
        val cls = PicoPlatformSdkDetector.findAvailable(*candidates) ?: return false
        for (name in arrayOf("start", "startTracking", "enable", "setEnabled")) {
            if (invokeBooleanArg(cls, name, true)) return true
            if (invokeNoArg(cls, name) != null) return true
        }
        return false
    }

    private fun tryStop(candidates: Array<String>): Boolean {
        val cls = PicoPlatformSdkDetector.findAvailable(*candidates) ?: return false
        for (name in arrayOf("stop", "stopTracking", "disable", "setEnabled")) {
            if (invokeBooleanArg(cls, name, false)) return true
            if (invokeNoArg(cls, name) != null) return true
        }
        return false
    }

    private fun invokeBooleanArg(className: String, methodName: String, value: Boolean): Boolean {
        return try {
            val clazz = Class.forName(className, false, javaClass.classLoader)
            val method = clazz.getDeclaredMethod(methodName, Boolean::class.javaPrimitiveType!!)
            method.isAccessible = true
            method.invoke(null, value)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun invokeNoArg(className: String, methodName: String): Any? {
        return try {
            val clazz = Class.forName(className, false, javaClass.classLoader)
            val method = clazz.getDeclaredMethod(methodName)
            method.isAccessible = true
            method.invoke(null)
        } catch (_: Throwable) {
            null
        }
    }

    /**
     * Read each of [keys] as a static getter/field off [className]. Wraps
     * results into a stable shape map. Missing keys are present as null
     * so JS destructuring stays safe.
     */
    private fun readPoseFields(className: String, keys: Array<String>): Map<String, Any?> {
        return try {
            val clazz = Class.forName(className, false, javaClass.classLoader)
            buildMap {
                for (k in keys) {
                    put(k, readOne(clazz, k))
                }
            }
        } catch (_: Throwable) {
            emptyMap()
        }
    }

    private fun readOne(clazz: Class<*>, name: String): Any? {
        // Try `get<Name>()` first (Java bean), then a public field, then
        // a same-name method. Different SDK versions land on different
        // shapes; this covers the three patterns observed in shipping
        // PICO SDK AARs.
        val getter = "get" + name.replaceFirstChar { it.uppercase() }
        return try {
            val method = clazz.getDeclaredMethod(getter)
            method.isAccessible = true
            method.invoke(null)
        } catch (_: Throwable) {
            try {
                val field = clazz.getDeclaredField(name)
                field.isAccessible = true
                field.get(null)
            } catch (_: Throwable) {
                try {
                    val method = clazz.getDeclaredMethod(name)
                    method.isAccessible = true
                    method.invoke(null)
                } catch (_: Throwable) {
                    null
                }
            }
        }
    }
}
