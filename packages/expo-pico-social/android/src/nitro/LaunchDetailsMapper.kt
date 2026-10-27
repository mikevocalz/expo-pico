package com.margelo.nitro.expopico.social

import com.pico.pps.sdk.social.LaunchDetails as PpsLaunchDetails
import com.pico.pps.sdk.social.LaunchResult
import com.pico.pps.sdk.social.LaunchType

/**
 * Converts a PPS 1.0 `LaunchDetails` into the `PicoLaunchDetails` struct the
 * spec returns. Shared by the synchronous getter and the launch-intent
 * callback so both report the same shape.
 *
 * Getter names come from `javap` on platform-service-social-1.0.0. Only call
 * [toPicoLaunchDetails] after `PicoPps.sdkPresent` is true: the PPS types are
 * `compileOnly` and absent on the mobile flavor.
 */
internal object LaunchDetailsMapper {
  /** What JS sees when PPS is absent or has no launch intent to report. */
  fun normalLaunch(): PicoLaunchDetails = PicoLaunchDetails(
    launchType = PicoLaunchType.NORMAL,
    launchResult = PicoLaunchResult.UNKNOWN,
    launchSource = "",
    deepLinkMessage = "",
    destinationApiName = "",
    trackingId = "",
    lobbySessionId = "",
    matchSessionId = "",
    extra = "",
    clientAction = "",
  )

  fun toPicoLaunchDetails(details: PpsLaunchDetails): PicoLaunchDetails =
    PicoLaunchDetails(
      launchType = when (details.launchType) {
        LaunchType.NORMAL -> PicoLaunchType.NORMAL
        LaunchType.INVITE -> PicoLaunchType.INVITE
        LaunchType.COORDINATED -> PicoLaunchType.COORDINATED
        LaunchType.DEEPLINK -> PicoLaunchType.DEEPLINK
        else -> PicoLaunchType.UNKNOWN
      },
      launchResult = when (details.launchResult) {
        LaunchResult.SUCCESS -> PicoLaunchResult.SUCCESS
        LaunchResult.FAILED_ROOM_FULL -> PicoLaunchResult.FAILED_ROOM_FULL
        LaunchResult.FAILED_GAME_ALREADY_STARTED ->
          PicoLaunchResult.FAILED_GAME_ALREADY_STARTED
        LaunchResult.FAILED_ROOM_NOT_FOUND -> PicoLaunchResult.FAILED_ROOM_NOT_FOUND
        LaunchResult.FAILED_USER_DECLINED -> PicoLaunchResult.FAILED_USER_DECLINED
        LaunchResult.FAILED_OTHER_REASON -> PicoLaunchResult.FAILED_OTHER
        else -> PicoLaunchResult.UNKNOWN
      },
      launchSource = details.launchSource.orEmpty(),
      deepLinkMessage = details.deepLinkMessage.orEmpty(),
      destinationApiName = details.destinationApiName.orEmpty(),
      trackingId = details.trackingID.orEmpty(),
      lobbySessionId = details.lobbySessionID.orEmpty(),
      matchSessionId = details.matchSessionID.orEmpty(),
      extra = details.extra.orEmpty(),
      clientAction = details.clientAction.orEmpty(),
    )
}
