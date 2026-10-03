package expo.modules.pico.achievements

/**
 * Joins PPS `AchievementDefinition` and `AchievementProgress` maps (as produced
 * by PicoPlatformSDK.objectToMap) into the JS `Achievement` shape.
 *
 * Definitions carry title/type/target; only progress carries unlock state, so
 * every read needs both.
 */
internal object AchievementMapper {
    fun merge(
        definitions: List<Map<String, Any?>>,
        progress: List<Map<String, Any?>>,
    ): List<Map<String, Any?>> {
        val progressByName = progress.associateBy { it["name"] as? String }
        return definitions.mapNotNull { def ->
            val name = def["name"] as? String ?: return@mapNotNull null
            if (def["archived"] == true) return@mapNotNull null
            toAchievement(def, progressByName[name])
        }
    }

    private fun toAchievement(def: Map<String, Any?>, prog: Map<String, Any?>?): Map<String, Any?> {
        val type = typeOf(def)
        val target = (def["target"] as? Number)?.toLong() ?: 0L
        val bitfieldLength = (def["bitfieldLength"] as? Number)?.toLong() ?: 0L
        val unlocked = prog?.get("unlocked") == true
        val count = (prog?.get("count") as? Number)?.toLong() ?: 0L
        val bitsSet = bitsSet(prog?.get("bitfield") as? String)

        val fraction = when {
            unlocked -> 1.0
            type == "count" && target > 0 -> (count.toDouble() / target).coerceIn(0.0, 1.0)
            type == "bitfield" && bitfieldLength > 0 -> (bitsSet.toDouble() / bitfieldLength).coerceIn(0.0, 1.0)
            else -> 0.0
        }

        return buildMap {
            put("apiName", def["name"])
            put("title", def["title"] ?: "")
            put("description", (if (unlocked) def["unlockedDescription"] as? String else null) ?: def["description"] ?: "")
            put("type", type)
            put("visibility", if (def["secret"] == true) "hidden" else "always-visible")
            if (type == "count") put("target", target)
            if (type == "bitfield") put("bitfieldLength", bitfieldLength)
            (if (unlocked) def["unlockedImageURL"] else def["lockedImageURL"])
                ?.let { url -> (url as? String)?.takeIf { it.isNotEmpty() }?.let { put("iconUrl", it) } }
            put("isUnlocked", unlocked)
            if (unlocked) toEpochMs(prog?.get("unlockTime"))?.let { put("unlockedAtMs", it) }
            put("progress", fraction)
            // Raw counters, used to build AddCountResult / AddBitfieldResult.
            put("count", count)
            put("bitsSet", bitsSet)
        }
    }

    // PPS reports type as a JNI-backed int (ppfAchievementType). Read the real
    // constants when the native lib is loaded; otherwise infer from the shape.
    private fun typeOf(def: Map<String, Any?>): String {
        val code = (def["type"] as? Number)?.toInt()
        if (code != null) {
            nativeTypeCodes?.get(code)?.let { return it }
        }
        return when {
            ((def["bitfieldLength"] as? Number)?.toLong() ?: 0L) > 0 -> "bitfield"
            ((def["target"] as? Number)?.toLong() ?: 0L) > 1 -> "count"
            else -> "simple"
        }
    }

    private val nativeTypeCodes: Map<Int, String>? by lazy {
        runCatching {
            val cls = Class.forName("com.bytedance.pico.platformsdk.jni.ppfAchievementType")
            mapOf(
                cls.getField("ppfAchievement_TypeSimple").getInt(null) to "simple",
                cls.getField("ppfAchievement_TypeCount").getInt(null) to "count",
                cls.getField("ppfAchievement_TypeBitfield").getInt(null) to "bitfield",
            )
        }.getOrNull()
    }

    private fun bitsSet(bitfield: String?): Int = bitfield?.count { it == '1' } ?: 0

    // ponytail: PPS doesn't document unlockTime's unit. Values below 1e12 can't
    // be epoch ms after 2001, so treat them as seconds. Drop this once PICO
    // documents the unit.
    private fun toEpochMs(raw: Any?): Long? {
        val t = (raw as? Number)?.toLong()?.takeIf { it > 0 } ?: return null
        return if (t < 1_000_000_000_000L) t * 1000 else t
    }
}
