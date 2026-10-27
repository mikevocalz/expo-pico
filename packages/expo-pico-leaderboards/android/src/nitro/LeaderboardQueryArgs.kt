package com.margelo.nitro.expopico.leaderboards

import com.bytedance.pico.platformsdk.jni.ppfLeaderboardFilterType
import com.bytedance.pico.platformsdk.jni.ppfLeaderboardStartAt

/**
 * Maps `LeaderboardFilter` / `LeaderboardStartAt` to the PPS enum ints.
 *
 * The `ppf*` fields are not compile-time constants: each class's static
 * initializer fills them through `PicoJNI`, so the values are only known at
 * runtime and are never hard-coded here. Touching the class loads the PPS
 * native library; if that fails the call is rejected rather than sent with a
 * guessed value.
 *
 * PPS `ppfLeaderboardFilterType` offers None, Friends and UserIds. There is
 * no viewer-and-friends filter, so that TypeScript value is rejected instead
 * of silently falling back to the global board.
 */
internal object LeaderboardQueryArgs {

  /** `null` means the TypeScript default, `'none'` (global board). */
  fun filter(value: LeaderboardFilter?): Int = when (value) {
    null, LeaderboardFilter.NONE -> read("ppfLeaderboard_FilterNone") {
      ppfLeaderboardFilterType.ppfLeaderboard_FilterNone
    }
    LeaderboardFilter.FRIENDS -> read("ppfLeaderboard_FilterFriends") {
      ppfLeaderboardFilterType.ppfLeaderboard_FilterFriends
    }
    LeaderboardFilter.VIEWER_AND_FRIENDS -> throw IllegalArgumentException(
      "UNSUPPORTED_FILTER: leaderboard filter 'viewer-and-friends' is not supported: the PICO " +
        "Platform SDK has no such filter (ppfLeaderboardFilterType offers only None, Friends " +
        "and UserIds)."
    )
  }

  /** `null` means the TypeScript default, `'centered-on-viewer'`. */
  fun startAt(value: LeaderboardStartAt?): Int = when (value) {
    LeaderboardStartAt.TOP -> read("ppfLeaderboard_StartAtTop") {
      ppfLeaderboardStartAt.ppfLeaderboard_StartAtTop
    }
    null, LeaderboardStartAt.CENTERED_ON_VIEWER -> read("ppfLeaderboard_StartAtCenteredOnViewer") {
      ppfLeaderboardStartAt.ppfLeaderboard_StartAtCenteredOnViewer
    }
  }

  private inline fun read(field: String, get: () -> Int): Int {
    try {
      return get()
    } catch (t: Throwable) {
      throw IllegalStateException(
        "PPS_ENUM_UNAVAILABLE: could not read com.bytedance.pico.platformsdk.jni.$field from the " +
          "PICO Platform SDK (${t.javaClass.simpleName}: ${t.message})",
        t,
      )
    }
  }
}
