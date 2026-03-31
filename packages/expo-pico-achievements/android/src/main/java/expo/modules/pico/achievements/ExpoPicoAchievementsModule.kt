package expo.modules.pico.achievements

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoAchievementsModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ExpoPicoAchievements")

    Events("onAchievementUnlocked")

    Constants {
      mapOf(
        "achievementsSdkAvailable" to AchievementsUtils.isAchievementsSdkAvailable(),
        "achievementsSdkVersion"   to AchievementsUtils.getAchievementsSdkVersion()
      )
    }

    AsyncFunction("getAllAchievements") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      AchievementsBridge.getAllAchievements(
        onSuccess = { list -> promise.resolve(list) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // apiNames: List<String> bridged automatically from JS string array
    AsyncFunction("getAchievementProgress") { apiNames: List<String>, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      AchievementsBridge.getProgress(apiNames,
        onSuccess = { list -> promise.resolve(list) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("unlockAchievement") { apiName: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      AchievementsBridge.unlock(apiName,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    // count: Int bridged from JS number automatically
    AsyncFunction("addAchievementCount") { apiName: String, count: Int, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      AchievementsBridge.addCount(apiName, count,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }

    AsyncFunction("addAchievementBitfield") { apiName: String, bits: String, promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      AchievementsBridge.addBitfield(apiName, bits,
        onSuccess = { bundle -> promise.resolve(bundle) },
        onError   = { code, msg -> promise.reject(code, msg, null) }
      )
    }
  }

  private inline fun guardAvailability(promise: Promise, earlyReturn: () -> Unit) {
    if (!AchievementsUtils.isAchievementsSdkAvailable()) {
      promise.reject("SERVICE_UNAVAILABLE", "Achievements SDK not available on this build", null)
      earlyReturn()
    }
  }

  /** Called by AchievementsBridge when SDK fires an unlock callback for a push notification */
  internal fun emitAchievementUnlocked(apiName: String) {
    sendEvent("onAchievementUnlocked", mapOf(
      "apiName"      to apiName,
      "unlockedAtMs" to System.currentTimeMillis()
    ))
  }
}
