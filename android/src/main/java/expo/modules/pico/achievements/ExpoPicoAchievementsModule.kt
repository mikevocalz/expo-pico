package expo.modules.pico.achievements

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class ExpoPicoAchievementsModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ExpoPicoAchievements")

    Events("onAchievementUnlocked")

    // PPS has no unlock push listener. Writes from this app that report
    // justUnlocked emit the event instead.
    OnCreate { AchievementsBridge.onUnlocked = ::emitAchievementUnlocked }
    OnDestroy { AchievementsBridge.onUnlocked = null }

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

    // Native so JS's definitions-only fallback shim never runs: definitions
    // carry no unlock state.
    AsyncFunction("getUnlockedAchievements") { promise: Promise ->
      guardAvailability(promise) { return@AsyncFunction }
      AchievementsBridge.getUnlockedAchievements(
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

    // count: Long bridged from JS number automatically (PPS addCount takes a Long)
    AsyncFunction("addAchievementCount") { apiName: String, count: Long, promise: Promise ->
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

  private fun emitAchievementUnlocked(apiName: String) {
    sendEvent("onAchievementUnlocked", mapOf(
      "apiName"      to apiName,
      "unlockedAtMs" to System.currentTimeMillis()
    ))
  }
}
